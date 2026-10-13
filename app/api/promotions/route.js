// /api/promotions : les remises du chauffeur. Lecture par l'équipe, création / modification / suppression par le PATRON.
//   GET                                   -> { promotions: [{ id, name, percent, scope, code, starts_on, ends_on, active }] }
//   POST   { name, percent, scope, code?, starts_on?, ends_on?, active? }   -> { ok: true }
//   PATCH  { id, active }                 -> active / désactive
//   PATCH  { id, name, percent, scope, … } -> modifie
//   DELETE { id }                         -> supprime
// En-tête Authorization: Bearer <jeton de connexion>.
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 404, 409, 413, 415 ou 500
import { z } from "zod";
import { exigerEquipe } from "@/lib/auth";
import { lireTexteLimite } from "@/lib/http";
import { validerPromotion } from "@/lib/promotions";
import { oublierPromotions } from "@/lib/promotions-serveur";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const identifiant = z.uuid();
const reponse = (corps, status = 200) => Response.json(corps, { status, headers: SANS_CACHE });
const erreur = (message, status) => reponse({ erreur: message }, status);

async function exigerPatron(request) {
  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return equipe;
  if (equipe.role !== "patron") return { ok: false, status: 403, erreur: "Seul le patron peut gérer les promotions." };
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

const erreurBase = (e, contexte) => {
  console.error(`[api/promotions] ${contexte} :`, e?.code, e?.message);
  return e?.code === "23505" ? erreur("Ce code existe déjà. Choisissez-en un autre.", 409) : erreur("Impossible d'enregistrer pour le moment.", 500);
};

export async function GET(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);
    const { data, error } = await supabaseServeur()
      .from("promotions")
      .select("id, name, percent, scope, code, starts_on, ends_on, active")
      .order("created_at", { ascending: false });
    if (error) return erreurBase(error, "lecture");
    return reponse({ promotions: data });
  } catch (e) {
    console.error("[api/promotions] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de lire les promotions.", 500);
  }
}

export async function POST(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = validerPromotion(lu.corps);
    if (!lecture.ok) return erreur(lecture.erreur, 400);
    const { error } = await supabaseServeur().from("promotions").insert(lecture.valeurs);
    if (error) return erreurBase(error, "création");
    oublierPromotions();
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/promotions] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'enregistrer pour le moment.", 500);
  }
}

export async function PATCH(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    if (!identifiant.safeParse(lu.corps?.id).success) return erreur("Promotion introuvable.", 404);

    // Seulement { id, active } : on active ou désactive. Sinon, modification complète (validée comme une création).
    let valeurs;
    if (Object.keys(lu.corps).every((k) => k === "id" || k === "active")) {
      if (typeof lu.corps.active !== "boolean") return erreur("Demande invalide.", 400);
      valeurs = { active: lu.corps.active };
    } else {
      const lecture = validerPromotion(lu.corps);
      if (!lecture.ok) return erreur(lecture.erreur, 400);
      valeurs = lecture.valeurs;
    }
    const { data, error } = await supabaseServeur().from("promotions").update(valeurs).eq("id", lu.corps.id).select("id").maybeSingle();
    if (error) return erreurBase(error, "modification");
    if (!data) return erreur("Promotion introuvable.", 404);
    oublierPromotions();
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/promotions] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'enregistrer pour le moment.", 500);
  }
}

export async function DELETE(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    if (!identifiant.safeParse(lu.corps?.id).success) return erreur("Promotion introuvable.", 404);
    const { error } = await supabaseServeur().from("promotions").delete().eq("id", lu.corps.id);
    if (error) return erreurBase(error, "suppression");
    oublierPromotions();
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/promotions] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de supprimer pour le moment.", 500);
  }
}
