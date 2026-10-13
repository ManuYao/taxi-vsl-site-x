// /api/paiements : encaisser une course.
//   POST   { bookingId, mode: "especes"|"carte"|"tiers_payant"|"virement", montant }   (équipe)
//          -> la course acceptée passe à « terminée » et le paiement est enregistré ; { ok: true }
//          réservé au patron ou à la personne qui a pris la course. Le tiers payant est « à recevoir » tant qu'il n'est pas reçu.
//   PATCH  { id, action: "recu" }   (patron)  -> le tiers payant est arrivé : il passe à « encaissé »
//   DELETE { id }                   (patron)  -> annule un paiement saisi par erreur : la course redevient « acceptée »
// En-tête Authorization: Bearer <jeton de connexion>.
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 404, 409, 413, 415 ou 500
import { z } from "zod";
import { exigerEquipe } from "@/lib/auth";
import { validerPaiement } from "@/lib/caisse";
import { lireTexteLimite } from "@/lib/http";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const identifiant = z.uuid();
const reponse = (corps, status = 200) => Response.json(corps, { status, headers: SANS_CACHE });
const erreur = (message, status) => reponse({ erreur: message }, status);

async function lireJson(request) {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return { status: 415, erreur: "Format de demande non pris en charge." };
  const texte = await lireTexteLimite(request, 1024);
  if (texte === null) return { status: 413, erreur: "Demande trop volumineuse." };
  try {
    return { corps: JSON.parse(texte) };
  } catch {
    return { status: 400, erreur: "Demande illisible." };
  }
}

async function exigerPatron(request) {
  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return equipe;
  if (equipe.role !== "patron") return { ok: false, status: 403, erreur: "Réservé au patron." };
  return equipe;
}

export async function POST(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    const lecture = validerPaiement(lu.corps);
    if (!lecture.ok) return erreur(lecture.erreur, 400);
    const { bookingId, mode, amountCents } = lecture.valeurs;

    const base = supabaseServeur();
    const { data: course } = await base.from("bookings").select("id, status, accepted_by").eq("id", bookingId).maybeSingle();
    if (!course) return erreur("Course introuvable.", 404);
    if (course.status === "done") return erreur("Cette course est déjà encaissée.", 409);
    if (course.status !== "accepted") return erreur("Seule une course acceptée peut être encaissée.", 409);
    if (equipe.role !== "patron" && course.accepted_by !== equipe.user.id) return erreur("Seule la personne qui a pris la course, ou le patron, peut l'encaisser.", 403);

    // La course passe à « terminée » d'abord, et seulement si elle est encore « acceptée » : deux personnes ne peuvent pas l'encaisser ensemble.
    const { data: terminee, error: e1 } = await base.from("bookings").update({ status: "done" }).eq("id", bookingId).eq("status", "accepted").select("id").maybeSingle();
    if (e1) {
      console.error("[api/paiements] course non modifiée :", e1.message);
      return erreur("Impossible d'enregistrer le paiement pour le moment.", 500);
    }
    if (!terminee) return erreur("Cette course vient d'être encaissée par quelqu'un d'autre.", 409);

    const attente = mode === "tiers_payant"; // à recevoir de l'Assurance Maladie
    const { error: e2 } = await base.from("payments").insert({
      booking_id: bookingId,
      mode,
      amount_cents: amountCents,
      status: attente ? "pending" : "paid",
      paid_at: attente ? null : new Date().toISOString(),
      created_by: equipe.user.id,
    });
    if (e2) {
      await base.from("bookings").update({ status: "accepted" }).eq("id", bookingId); // on remet la course comme avant
      console.error("[api/paiements] paiement non enregistré :", e2.message);
      return erreur("Impossible d'enregistrer le paiement pour le moment.", 500);
    }
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/paiements] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'enregistrer le paiement pour le moment.", 500);
  }
}

export async function PATCH(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    if (!identifiant.safeParse(lu.corps?.id).success || lu.corps?.action !== "recu") return erreur("Demande invalide.", 400);
    const { data, error } = await supabaseServeur()
      .from("payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", lu.corps.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[api/paiements] mise à jour impossible :", error.message);
      return erreur("Impossible de modifier le paiement pour le moment.", 500);
    }
    if (!data) return erreur("Ce paiement n'est pas en attente.", 409);
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/paiements] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de modifier le paiement pour le moment.", 500);
  }
}

export async function DELETE(request) {
  try {
    const patron = await exigerPatron(request);
    if (!patron.ok) return erreur(patron.erreur, patron.status);
    const lu = await lireJson(request);
    if (lu.erreur) return erreur(lu.erreur, lu.status);
    if (!identifiant.safeParse(lu.corps?.id).success) return erreur("Paiement introuvable.", 404);
    const base = supabaseServeur();
    const { data: paiement } = await base.from("payments").select("id, booking_id").eq("id", lu.corps.id).maybeSingle();
    if (!paiement) return erreur("Paiement introuvable.", 404);
    const { error } = await base.from("payments").delete().eq("id", paiement.id);
    if (error) {
      console.error("[api/paiements] suppression impossible :", error.message);
      return erreur("Impossible d'annuler le paiement pour le moment.", 500);
    }
    await base.from("bookings").update({ status: "accepted" }).eq("id", paiement.booking_id).eq("status", "done"); // la course est de nouveau à encaisser
    return reponse({ ok: true });
  } catch (e) {
    console.error("[api/paiements] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'annuler le paiement pour le moment.", 500);
  }
}
