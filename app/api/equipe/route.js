// /api/equipe : gestion des accès de l'espace chauffeur, selon le niveau (0 chauffeur, 1 manager, 2 patron).
//
// Réservé aux niveaux 1 et 2 : en-tête Authorization: Bearer <jeton de connexion>.
// On ne gère que des personnes de niveau strictement inférieur au sien, jamais soi-même.
//   GET                                   -> { equipe: [{ id, nom, email, niveau, actif, moi, gerable, niveauModifiable }], monNiveau, niveauxAttribuables }
//   POST  { nom, email, niveau? }         -> { ok: true, motDePasse }    crée l'accès ; le mot de passe provisoire n'est montré QU'UNE FOIS
//   PATCH { id, action, niveau? }         -> { ok: true } ou { ok: true, motDePasse }
//         action : "supprimer" | "nouveau-mot-de-passe" | "changer-niveau" (patron seulement, niveau 0 ou 1)
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 404, 409, 413, 415, 429 ou 500
import { z } from "zod";
import { exigerEquipe } from "@/lib/auth";
import { genererMotDePasse } from "@/lib/equipe";
import { creerLimiteur, lireTexteLimite } from "@/lib/http";
import { NIVEAU_MANAGER, niveauxAttribuables, peutChangerNiveau, peutGerer } from "@/lib/niveaux";
import { nettoyer } from "@/lib/reservation";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const limiteur = creerLimiteur({ max: 30, fenetreMs: 10 * 60_000 }); // par personne

const schemaAjout = z.object({
  nom: z.string().max(200).transform(nettoyer).pipe(z.string().min(1).max(60)),
  email: z.email().max(200).transform((e) => e.trim().toLowerCase()),
  niveau: z.number().int().min(0).max(1).default(0),
});
const schemaAction = z.object({
  id: z.uuid(),
  action: z.enum(["supprimer", "nouveau-mot-de-passe", "changer-niveau"]),
  niveau: z.number().int().min(0).max(1).optional(),
});

const reponse = (corps, status = 200) => Response.json(corps, { status, headers: SANS_CACHE });
const erreur = (message, status) => reponse({ erreur: message }, status);

async function exigerGestion(request) {
  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return equipe;
  if (equipe.niveau < NIVEAU_MANAGER) return { ok: false, status: 403, erreur: "Réservé aux managers et au patron." };
  const attente = limiteur(equipe.user.id);
  if (attente) return { ok: false, status: 429, erreur: "Trop d'actions. Réessayez dans quelques minutes." };
  return equipe;
}

async function lireJson(request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { status: 415, erreur: "Format de demande non pris en charge." };
  const texte = await lireTexteLimite(request, 2048);
  if (texte === null) return { status: 413, erreur: "Demande trop volumineuse." };
  try {
    return { corps: JSON.parse(texte) };
  } catch {
    return { status: 400, erreur: "Demande illisible." };
  }
}

export async function GET(request) {
  try {
    const moi = await exigerGestion(request);
    if (!moi.ok) return erreur(moi.erreur, moi.status);
    const base = supabaseServeur();
    const [{ data: fiches, error: e1 }, { data: comptes, error: e2 }] = await Promise.all([
      base.from("staff").select("user_id, niveau, display_name, active, created_at").order("created_at", { ascending: true }),
      base.auth.admin.listUsers({ perPage: 200 }),
    ]);
    if (e1 || e2) {
      console.error("[api/equipe] lecture impossible :", (e1 ?? e2).message);
      return erreur("Impossible de lire l'équipe pour le moment.", 500);
    }
    const emails = new Map(comptes.users.map((u) => [u.id, u.email]));
    const acteur = { id: moi.user.id, niveau: moi.niveau };
    return reponse({
      monNiveau: moi.niveau,
      niveauxAttribuables: niveauxAttribuables(moi.niveau),
      equipe: fiches.map((f) => {
        const cible = { id: f.user_id, niveau: f.niveau };
        return {
          id: f.user_id,
          nom: f.display_name,
          email: emails.get(f.user_id) ?? "",
          niveau: f.niveau,
          actif: f.active,
          moi: f.user_id === moi.user.id,
          gerable: peutGerer(acteur, cible),
          niveauModifiable: peutChangerNiveau(acteur, cible),
        };
      }),
    });
  } catch (e) {
    console.error("[api/equipe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de lire l'équipe pour le moment.", 500);
  }
}

export async function POST(request) {
  try {
    const moi = await exigerGestion(request);
    if (!moi.ok) return erreur(moi.erreur, moi.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = schemaAjout.safeParse(lu.corps);
    if (!lecture.success) return erreur(lecture.error.issues[0]?.path?.[0] === "email" ? "L'adresse e-mail ne semble pas valide." : "Indiquez le prénom (ou le nom) de la personne.", 400);
    const { nom, email, niveau } = lecture.data;
    if (!niveauxAttribuables(moi.niveau).includes(niveau)) return erreur("Vous ne pouvez pas donner ce niveau.", 403);

    const base = supabaseServeur();
    const motDePasse = genererMotDePasse();
    // Compte de connexion : e-mail déjà confirmé (aucun e-mail envoyé), mot de passe provisoire à changer au premier accès
    const { data: cree, error } = await base.auth.admin.createUser({ email, password: motDePasse, email_confirm: true, user_metadata: { doit_changer_mdp: true } });
    if (error || !cree?.user) {
      if (error?.code === "email_exists" || error?.status === 422) return erreur("Cette adresse a déjà un accès.", 409);
      console.error("[api/equipe] création du compte impossible :", error?.code, error?.message);
      return erreur("Impossible de créer l'accès pour le moment.", 500);
    }
    const { error: erreurFiche } = await base.from("staff").insert({ user_id: cree.user.id, niveau, display_name: nom, active: true });
    if (erreurFiche) {
      await base.auth.admin.deleteUser(cree.user.id); // pas de compte à moitié créé
      console.error("[api/equipe] fiche d'équipe impossible :", erreurFiche.message);
      return erreur("Impossible de créer l'accès pour le moment.", 500);
    }
    return reponse({ ok: true, motDePasse });
  } catch (e) {
    console.error("[api/equipe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de créer l'accès pour le moment.", 500);
  }
}

export async function PATCH(request) {
  try {
    const moi = await exigerGestion(request);
    if (!moi.ok) return erreur(moi.erreur, moi.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = schemaAction.safeParse(lu.corps);
    if (!lecture.success) return erreur("Demande invalide.", 400);
    const { id, action, niveau } = lecture.data;

    const base = supabaseServeur();
    const { data: fiche } = await base.from("staff").select("user_id, niveau").eq("user_id", id).maybeSingle();
    if (!fiche) return erreur("Personne introuvable.", 404);

    // Vérifié ici, côté serveur : cacher un bouton ne protège de rien
    const acteur = { id: moi.user.id, niveau: moi.niveau };
    const cible = { id: fiche.user_id, niveau: fiche.niveau };
    if (id === moi.user.id) return erreur("Vous ne pouvez pas faire cela sur votre propre accès.", 400);
    if (!peutGerer(acteur, cible)) return erreur("Vous n'avez pas le droit de gérer cette personne.", 403);

    if (action === "nouveau-mot-de-passe") {
      const motDePasse = genererMotDePasse();
      const { error } = await base.auth.admin.updateUserById(id, { password: motDePasse, user_metadata: { doit_changer_mdp: true } });
      if (error) {
        console.error("[api/equipe] nouveau mot de passe impossible :", error.code, error.message);
        return erreur("Impossible de changer le mot de passe pour le moment.", 500);
      }
      return reponse({ ok: true, motDePasse });
    }

    if (action === "changer-niveau") {
      if (!peutChangerNiveau(acteur, cible) || niveau === undefined) return erreur("Seul le patron peut changer le niveau.", 403);
      const { error } = await base.from("staff").update({ niveau }).eq("user_id", id);
      if (error) {
        console.error("[api/equipe] changement de niveau impossible :", error.message);
        return erreur("Impossible de changer le niveau pour le moment.", 500);
      }
      return reponse({ ok: true });
    }

    // Suppression définitive : le compte de connexion part, la fiche d'équipe avec (cascade). Les courses gardées restent.
    const { error } = await base.auth.admin.deleteUser(id);
    if (error) {
      console.error("[api/equipe] suppression impossible :", error.code, error.message);
      return erreur("Impossible de supprimer cet accès pour le moment.", 500);
    }
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/equipe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de modifier l'accès pour le moment.", 500);
  }
}
