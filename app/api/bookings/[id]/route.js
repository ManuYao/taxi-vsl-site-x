// PATCH /api/bookings/:id : le chauffeur accepte ou refuse une demande, ou annule une course déjà acceptée.
//
// Réservé à l'équipe : en-tête Authorization: Bearer <jeton de connexion>.
// Corps JSON : { action: "accepter" | "refuser" | "annuler" }
//   « annuler » : seulement une course acceptée, par le patron ou par la personne qui l'a prise.
// Réponse 200 : { ok: true, statut: "accepted" | "refused" | "cancelled" }
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 404, 409, 413, 415 ou 500
//
// « Premier qui accepte » : la mise à jour ne réussit que si la course est encore « pending ».
// Si deux chauffeurs appuient en même temps, un seul gagne, l'autre reçoit « déjà traitée ».
import { after } from "next/server";
import { z } from "zod";
import site from "@/site.config";
import { exigerEquipe } from "@/lib/auth";
import { lireTexteLimite } from "@/lib/http";
import { supabaseServeur } from "@/lib/supabase";
import { dateLisibleParis } from "@/lib/paris";
import { composerReponseClient } from "@/lib/reponse-client";
import { envoyerMail } from "@/lib/mail";
import { envoyerTelegram } from "@/lib/telegram";

const SANS_CACHE = { "Cache-Control": "no-store" };
const schema = z.object({ action: z.enum(["accepter", "refuser", "annuler"]) });
// action -> { statut en base, statut attendu avant, statut pour le message au client, texte pour l'équipe }
const ACTIONS = {
  accepter: { vers: "accepted", depuis: "pending", client: "acceptee", equipe: "✅ Course prise" },
  refuser: { vers: "refused", depuis: "pending", client: "refusee", equipe: "❌ Course refusée" },
  annuler: { vers: "cancelled", depuis: "accepted", client: "annulee", equipe: "🚫 Course annulée" },
};
const identifiant = z.uuid();

const erreur = (message, status) => Response.json({ erreur: message }, { status, headers: SANS_CACHE });
const echapper = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function PATCH(request, { params }) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);

    const { id } = await params;
    if (!identifiant.safeParse(id).success) return erreur("Course introuvable.", 404);

    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return erreur("Format de demande non pris en charge.", 415);
    }
    const texte = await lireTexteLimite(request, 1024);
    if (texte === null) return erreur("Demande trop volumineuse.", 413);
    let corps;
    try {
      corps = JSON.parse(texte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = schema.safeParse(corps);
    if (!lecture.success) return erreur("Action inconnue.", 400);
    const action = lecture.data.action;
    const regle = ACTIONS[action];

    const base = supabaseServeur();
    // Annuler une course acceptée : réservé au patron et à la personne qui l'a prise (pas aux autres chauffeurs)
    if (action === "annuler") {
      const { data: actuelle } = await base.from("bookings").select("status, accepted_by").eq("id", id).maybeSingle();
      if (!actuelle) return erreur("Course introuvable.", 404);
      if (actuelle.status !== "accepted") return erreur("Seule une course acceptée peut être annulée.", 409);
      if (equipe.role !== "patron" && actuelle.accepted_by !== equipe.user.id) {
        return erreur("Seule la personne qui a pris la course, ou le patron, peut l'annuler.", 403);
      }
    }

    const maintenant = new Date().toISOString();
    const modification =
      action === "accepter"
        ? { status: regle.vers, accepted_by: equipe.user.id, decided_at: maintenant }
        : { status: regle.vers, decided_at: maintenant };
    const { data: course, error } = await base
      .from("bookings")
      .update(modification)
      .eq("id", id)
      .eq("status", regle.depuis) // la mise à jour ne réussit que si la course est encore dans l'état attendu
      .select("id, status, customer_name, customer_phone, customer_email, from_label, to_label, pickup_at")
      .maybeSingle();
    if (error) {
      console.error("[api/bookings/:id] mise à jour impossible :", error.code, error.message);
      return erreur("Impossible de modifier la course pour le moment.", 500);
    }
    if (!course) {
      const { data: existante } = await base.from("bookings").select("status").eq("id", id).maybeSingle();
      if (!existante) return erreur("Course introuvable.", 404);
      return erreur("Cette course a déjà été traitée par quelqu'un d'autre.", 409);
    }

    // Suites sans bloquer la réponse au chauffeur : prévenir le client (e-mail) et le reste de l'équipe (Telegram)
    after(async () => {
      const quand = dateLisibleParis(new Date(course.pickup_at));
      const qui = equipe.nom || equipe.user.email;
      await envoyerTelegram(
        `${regle.equipe} par <b>${echapper(qui)}</b>\n${echapper(course.customer_name)} · ${echapper(quand)}\n${echapper(course.from_label)} → ${echapper(course.to_label)}`,
      );
      // L'e-mail au client n'est possible qu'avec un domaine vérifié chez Resend (RESEND_FROM) :
      // l'expéditeur d'essai de Resend n'écrit qu'au propriétaire du compte.
      if (course.customer_email && process.env.RESEND_FROM) {
        const mail = composerReponseClient({
          statut: regle.client,
          course: { nom: course.customer_name, pickupAt: course.pickup_at, depart: course.from_label, arrivee: course.to_label },
          entreprise: { nom: site.nom, telephone: site.telephone.affiche },
        });
        const envoi = await envoyerMail({ a: course.customer_email, ...mail });
        if (!envoi.ok) console.warn(`[api/bookings/:id] e-mail au client non envoyé (${envoi.raison})`);
      }
    });

    return Response.json({ ok: true, statut: course.status }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/bookings/:id] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de modifier la course pour le moment.", 500);
  }
}
