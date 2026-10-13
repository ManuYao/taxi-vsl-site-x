// /api/reglages : les tarifs du chauffeur, modifiables par le PATRON.
//   GET   (équipe)  -> { tarifs: { priseEnCharge, kmJour, kmNuit, minimum, confirmes } }
//   PATCH (patron)  -> { priseEnCharge, kmJour, kmNuit, minimum } (en euros, virgule acceptée) -> { ok: true, tarifs }
// En-tête Authorization: Bearer <jeton de connexion>.
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 413, 415 ou 500
import site from "@/site.config";
import { exigerEquipe } from "@/lib/auth";
import { lireTexteLimite } from "@/lib/http";
import { validerTarifs } from "@/lib/reglages";
import { lireTarifs, oublierReglages } from "@/lib/reglages-serveur";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const erreur = (message, status) => Response.json({ erreur: message }, { status, headers: SANS_CACHE });

export async function GET(request) {
  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return erreur(equipe.erreur, equipe.status);
  return Response.json({ tarifs: await lireTarifs(), parDefaut: site.tarifs }, { headers: SANS_CACHE });
}

export async function PATCH(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);
    if (equipe.role !== "patron") return erreur("Seul le patron peut modifier les tarifs.", 403);

    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return erreur("Format de demande non pris en charge.", 415);
    const texte = await lireTexteLimite(request, 1024);
    if (texte === null) return erreur("Demande trop volumineuse.", 413);
    let corps;
    try {
      corps = JSON.parse(texte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = validerTarifs(corps);
    if (!lecture.ok) return erreur(lecture.erreur, 400);

    const { error } = await supabaseServeur()
      .from("settings")
      .update({ tarifs: lecture.tarifs, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) {
      console.error("[api/reglages] enregistrement impossible :", error.message);
      return erreur("Impossible d'enregistrer les tarifs pour le moment.", 500);
    }
    oublierReglages();
    return Response.json({ ok: true, tarifs: await lireTarifs() }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/reglages] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'enregistrer les tarifs pour le moment.", 500);
  }
}
