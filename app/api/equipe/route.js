// /api/equipe : le patron gère les accès de l'espace chauffeur (liste, ajout, désactivation, nouveau mot de passe).
//
// Réservé au PATRON : en-tête Authorization: Bearer <jeton de connexion>.
//   GET                                   -> { equipe: [{ id, nom, email, role, actif, moi }] }
//   POST  { nom, email, role? }           -> { ok: true, motDePasse }    crée l'accès ; le mot de passe provisoire n'est montré QU'UNE FOIS
//   PATCH { id, action }                  -> { ok: true } ou { ok: true, motDePasse }
//         action : "desactiver" | "reactiver" | "nouveau-mot-de-passe"
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 404, 409, 413, 415, 429 ou 500
import { z } from "zod";
import { exigerEquipe } from "@/lib/auth";
import { genererMotDePasse } from "@/lib/equipe";
import { creerLimiteur, lireTexteLimite } from "@/lib/http";
import { nettoyer } from "@/lib/reservation";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const limiteur = creerLimiteur({ max: 30, fenetreMs: 10 * 60_000 }); // par patron

const schemaAjout = z.object({
  nom: z.string().max(200).transform(nettoyer).pipe(z.string().min(1).max(60)),
  email: z.email().max(200).transform((e) => e.trim().toLowerCase()),
  role: z.enum(["chauffeur", "patron"]).default("chauffeur"),
});
const schemaAction = z.object({ id: z.uuid(), action: z.enum(["desactiver", "reactiver", "nouveau-mot-de-passe"]) });

const reponse = (corps, status = 200) => Response.json(corps, { status, headers: SANS_CACHE });
const erreur = (message, status) => reponse({ erreur: message }, status);

async function exigerPatron(request) {
  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return equipe;
  if (equipe.role !== "patron") return { ok: false, status: 403, erreur: "Réservé au patron." };
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
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const base = supabaseServeur();
    const [{ data: fiches, error: e1 }, { data: comptes, error: e2 }] = await Promise.all([
      base.from("staff").select("user_id, role, display_name, active, created_at").order("created_at", { ascending: true }),
      base.auth.admin.listUsers({ perPage: 200 }),
    ]);
    if (e1 || e2) {
      console.error("[api/equipe] lecture impossible :", (e1 ?? e2).message);
      return erreur("Impossible de lire l'équipe pour le moment.", 500);
    }
    const emails = new Map(comptes.users.map((u) => [u.id, u.email]));
    return reponse({
      equipe: fiches.map((f) => ({ id: f.user_id, nom: f.display_name, email: emails.get(f.user_id) ?? "", role: f.role, actif: f.active, moi: f.user_id === patron.user.id })),
    });
  } catch (e) {
    console.error("[api/equipe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de lire l'équipe pour le moment.", 500);
  }
}

export async function POST(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = schemaAjout.safeParse(lu.corps);
    if (!lecture.success) return erreur(lecture.error.issues[0]?.path?.[0] === "email" ? "L'adresse e-mail ne semble pas valide." : "Indiquez le prénom (ou le nom) de la personne.", 400);
    const { nom, email, role } = lecture.data;

    const base = supabaseServeur();
    const motDePasse = genererMotDePasse();
    // Compte de connexion : e-mail déjà confirmé (aucun e-mail envoyé), mot de passe provisoire à changer au premier accès
    const { data: cree, error } = await base.auth.admin.createUser({ email, password: motDePasse, email_confirm: true, user_metadata: { doit_changer_mdp: true } });
    if (error || !cree?.user) {
      if (error?.code === "email_exists" || error?.status === 422) return erreur("Cette adresse a déjà un accès.", 409);
      console.error("[api/equipe] création du compte impossible :", error?.code, error?.message);
      return erreur("Impossible de créer l'accès pour le moment.", 500);
    }
    const { error: erreurFiche } = await base.from("staff").insert({ user_id: cree.user.id, role, display_name: nom, active: true });
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
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = schemaAction.safeParse(lu.corps);
    if (!lecture.success) return erreur("Demande invalide.", 400);
    const { id, action } = lecture.data;

    const base = supabaseServeur();
    const { data: fiche } = await base.from("staff").select("user_id, active").eq("user_id", id).maybeSingle();
    if (!fiche) return erreur("Personne introuvable.", 404);

    if (action === "nouveau-mot-de-passe") {
      const motDePasse = genererMotDePasse();
      const { error } = await base.auth.admin.updateUserById(id, { password: motDePasse, user_metadata: { doit_changer_mdp: true } });
      if (error) {
        console.error("[api/equipe] nouveau mot de passe impossible :", error.code, error.message);
        return erreur("Impossible de changer le mot de passe pour le moment.", 500);
      }
      return reponse({ ok: true, motDePasse });
    }

    // Désactiver / réactiver. On ne peut pas se désactiver soi-même : le patron resterait enfermé dehors.
    if (action === "desactiver" && id === patron.user.id) return erreur("Vous ne pouvez pas désactiver votre propre accès.", 400);
    const { error } = await base.from("staff").update({ active: action === "reactiver" }).eq("user_id", id);
    if (error) {
      console.error("[api/equipe] mise à jour impossible :", error.message);
      return erreur("Impossible de modifier l'accès pour le moment.", 500);
    }
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/equipe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de modifier l'accès pour le moment.", 500);
  }
}
