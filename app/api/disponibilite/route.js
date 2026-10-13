// /api/disponibilite : le service de réservation en ligne est-il ouvert ?
//
//   GET    (public)  -> { ouvert, etat: "online" | "offline" | "vacances", message, jusquau }
//                       le site l'appelle pour afficher le formulaire ou le message de fermeture
//   PATCH  (équipe)  -> { state, date_from?, date_to?, message? }  change l'état ; réponse { ok: true, ...état en vigueur }
//                       en-tête Authorization: Bearer <jeton de connexion>
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 413, 415 ou 500
import { after } from "next/server";
import { exigerEquipe } from "@/lib/auth";
import { validerDisponibilite, etatEffectif } from "@/lib/disponibilite";
import { lireDisponibilite, oublierDisponibilite } from "@/lib/disponibilite-serveur";
import { lireTexteLimite } from "@/lib/http";
import { supabaseServeur } from "@/lib/supabase";
import { envoyerTelegram } from "@/lib/telegram";

const SANS_CACHE = { "Cache-Control": "no-store" };
const echapper = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const erreur = (message, status) => Response.json({ erreur: message }, { status, headers: SANS_CACHE });

export async function GET() {
  const etat = await lireDisponibilite();
  return Response.json(etat, { headers: SANS_CACHE });
}

export async function PATCH(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);

    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return erreur("Format de demande non pris en charge.", 415);
    const texte = await lireTexteLimite(request, 2048);
    if (texte === null) return erreur("Demande trop volumineuse.", 413);
    let corps;
    try {
      corps = JSON.parse(texte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = validerDisponibilite(corps);
    if (!lecture.ok) return erreur(lecture.erreur, 400);

    const { data, error } = await supabaseServeur()
      .from("availability")
      .update({ ...lecture.valeurs, updated_at: new Date().toISOString(), updated_by: equipe.user.id })
      .eq("id", 1)
      .select("state, date_from, date_to, message")
      .maybeSingle();
    if (error || !data) {
      console.error("[api/disponibilite] mise à jour impossible :", error?.message ?? "ligne absente");
      return erreur("Impossible de changer la disponibilité pour le moment.", 500);
    }
    oublierDisponibilite();

    // Le reste de l'équipe est prévenu par Telegram
    const etat = etatEffectif(data);
    after(async () => {
      const qui = echapper(equipe.nom || equipe.user.email);
      const titres = { online: "🟢 Réservations en ligne <b>ouvertes</b>", offline: "🔴 Réservations en ligne <b>fermées</b>", vacances: "🏖 <b>Vacances</b> : réservations en ligne fermées" };
      const dates = data.state === "vacances" ? `\n${data.date_from ? `du ${data.date_from} ` : ""}${data.date_to ? `au ${data.date_to}` : "jusqu'à nouvel ordre"}` : "";
      await envoyerTelegram(`${titres[data.state]} par ${qui}${dates}${data.message ? `\n« ${echapper(data.message)} »` : ""}`);
    });

    return Response.json({ ok: true, ...etat }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/disponibilite] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de changer la disponibilité pour le moment.", 500);
  }
}
