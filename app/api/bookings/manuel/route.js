// POST /api/bookings/manuel : le chauffeur ajoute lui-même une course au planning (un client vient d'appeler).
//
// Réservé à l'équipe : en-tête Authorization: Bearer <jeton de connexion>.
// Corps JSON : comme /api/bookings, sans jeton Turnstile ni champ piège, avec en plus montant? (prix convenu, en euros)
//   { requestId (uuid), depart, arrivee, arret?, date, heure, passagers, bagages, conventionne, refTrajet?,
//     codePromo?, nom, telephone, email?, montant? }
// La course est créée directement « acceptée » au nom de la personne connectée (elle peut l'annuler et l'encaisser).
// Sans coordonnées (adresse écrite à la main) il n'y a pas d'estimation : le prix convenu, ou le montant du taximètre, sert.
// Réponse 200 : { ok: true, prix: number | null, id }
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 413, 415 ou 500
import { after } from "next/server";
import site from "@/site.config";
import { exigerEquipe } from "@/lib/auth";
import { estimerCourse } from "@/lib/estimation-serveur";
import { lireTexteLimite } from "@/lib/http";
import { dateLisibleParis, parisVersUtc } from "@/lib/paris";
import { lireMontant } from "@/lib/reglages";
import { formaterTelephone, messageErreurReservation, schemaCourseManuelle } from "@/lib/reservation";
import { supabaseServeur } from "@/lib/supabase";
import { envoyerTelegram } from "@/lib/telegram";

const SANS_CACHE = { "Cache-Control": "no-store" };
const schema = schemaCourseManuelle({ maxPassagers: site.reservation.maxPassagers });
const erreur = (message, status) => Response.json({ erreur: message }, { status, headers: SANS_CACHE });
const echapper = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function POST(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);

    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return erreur("Format de demande non pris en charge.", 415);
    const texte = await lireTexteLimite(request, 8192);
    if (texte === null) return erreur("Demande trop volumineuse.", 413);
    let corps;
    try {
      corps = JSON.parse(texte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = schema.safeParse(corps);
    if (!lecture.success) return erreur(messageErreurReservation(lecture.error), 400);
    const d = lecture.data;

    // Une course déjà faite peut être ajoutée après coup (jusqu'à 24 h en arrière) ; pas plus d'un an en avant
    const pickup = parisVersUtc(d.date, d.heure);
    if (!pickup) return erreur("La date ou l'heure n'est pas valide.", 400);
    const maintenant = Date.now();
    if (pickup.getTime() < maintenant - 24 * 3_600_000) return erreur("Cette date est trop ancienne pour être ajoutée.", 400);
    if (pickup.getTime() > maintenant + 366 * 86_400_000) return erreur("Cette date est trop lointaine.", 400);

    // Prix : le montant convenu s'il est donné, sinon l'estimation du serveur (avec ses tarifs et promotions), sinon rien
    let convenuCents = null;
    if (d.montant !== undefined && String(d.montant).trim() !== "") {
      const euros = lireMontant(d.montant);
      if (euros === null || euros <= 0 || euros > 3000) return erreur("Le prix convenu n'est pas valide. Exemple : 25,50.", 400);
      convenuCents = Math.round(euros * 100);
    }
    const estimation = convenuCents === null ? await estimerCourse({ depart: d.depart, arrivee: d.arrivee, arret: d.arret, date: d.date, heure: d.heure, codePromo: d.codePromo }) : null;

    const telephone = formaterTelephone(d.telephone);
    const qui = equipe.nom || equipe.user.email;
    const { data, error } = await supabaseServeur()
      .from("bookings")
      .insert({
        client_request_id: d.requestId,
        status: "accepted",
        accepted_by: equipe.user.id,
        decided_at: new Date().toISOString(),
        from_label: d.depart.label,
        from_lat: d.depart.lat ?? null,
        from_lng: d.depart.lon ?? null,
        stop_label: d.arret?.label ?? null,
        stop_lat: d.arret?.lat ?? null,
        stop_lng: d.arret?.lon ?? null,
        to_label: d.arrivee.label,
        to_lat: d.arrivee.lat ?? null,
        to_lng: d.arrivee.lon ?? null,
        pickup_at: pickup.toISOString(),
        passengers: d.passagers,
        luggage: d.bagages,
        conventionne: d.conventionne,
        travel_ref: d.refTrajet || null,
        est_km: estimation?.km ?? null,
        est_minutes: estimation?.minutes ?? null,
        est_price_cents: convenuCents ?? estimation?.prixCents ?? null,
        est_price_before_cents: estimation?.prixAvantCents ?? null,
        promo_name: estimation?.promo?.nom ?? null,
        promo_percent: estimation?.promo?.pourcent ?? null,
        tarif: estimation?.tarif ?? null,
        est_approximatif: estimation?.approximatif ?? null,
        customer_name: d.nom,
        customer_phone: telephone,
        customer_email: d.email || null,
        note: `Ajoutée à la main par ${qui}`,
        alerts: { manuel: true },
      })
      .select("id")
      .maybeSingle();
    if (error) {
      // 23505 : déjà enregistrée (double appui) : on ne la refait pas
      if (error.code === "23505") return Response.json({ ok: true, doublon: true }, { headers: SANS_CACHE });
      console.error("[api/bookings/manuel] enregistrement impossible :", error.code, error.message);
      return erreur("Impossible d'ajouter la course pour le moment.", 500);
    }

    // Les collègues sont prévenus (la personne qui l'ajoute l'a déjà sous les yeux)
    after(async () => {
      await envoyerTelegram(
        `📞 Course ajoutée par <b>${echapper(qui)}</b>\n${echapper(d.nom)} · ${echapper(dateLisibleParis(pickup))}\n${echapper(d.depart.label)} → ${echapper(d.arrivee.label)}`,
      );
    });

    return Response.json({ ok: true, id: data?.id ?? null, prix: convenuCents !== null ? Math.round(convenuCents / 100) : (estimation?.prix ?? null) }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/bookings/manuel] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'ajouter la course pour le moment.", 500);
  }
}
