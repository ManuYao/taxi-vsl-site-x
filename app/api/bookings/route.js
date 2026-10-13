// POST /api/bookings : enregistre une demande de course et prévient le chauffeur.
//
// Corps JSON (Content-Type: application/json) :
//   { requestId (uuid), depart: { label, lat?, lon? }, arrivee: { … }, arret?: { … },
//     date: "YYYY-MM-DD", heure: "HH:MM" (heure de Paris), passagers, bagages, conventionne,
//     refTrajet?, nom, telephone, email?, jeton (Turnstile), piege? (champ caché, doit rester vide) }
// Réponse 200 : { ok: true, prix: number | null }
// Erreur : { erreur: "message court en français" } avec le code 400, 403, 413, 415, 429 ou 500
//
// Le prix est TOUJOURS recalculé ici : on ne fait jamais confiance à un prix envoyé par le navigateur.
import site from "@/site.config";
import { calculerPrix } from "@/lib/pricing";
import { itineraire } from "@/lib/routing";
import { dateLisibleParis, parisVersUtc } from "@/lib/paris";
import { composerAlertes, formaterTelephone, messageErreurReservation, schemaReservation } from "@/lib/reservation";
import { creerLimiteur, ipDuClient, lireTexteLimite } from "@/lib/http";
import { verifierTurnstile } from "@/lib/turnstile";
import { envoyerTelegram } from "@/lib/telegram";
import { envoyerPush } from "@/lib/push";
import { lireDisponibilite } from "@/lib/disponibilite-serveur";
import { lireTarifs } from "@/lib/reglages-serveur";
import { destinatairesAlertes, envoyerMail } from "@/lib/mail";
import { supabaseServeur } from "@/lib/supabase";

const TAILLE_MAX = 8192; // octets : une demande normale pèse environ 1 Ko
const SANS_CACHE = { "Cache-Control": "no-store" };
const limiteur = creerLimiteur({ max: 8, fenetreMs: 10 * 60_000 }); // par adresse IP : 8 demandes en 10 minutes
const schema = schemaReservation({ maxPassagers: site.reservation.maxPassagers });

const erreur = (message, status, headers) =>
  Response.json({ erreur: message }, { status, headers: { ...SANS_CACHE, ...headers } });

const avecCoordonnees = (l) => l?.lat !== undefined && l?.lon !== undefined;

export async function POST(request) {
  try {
    // Limite par IP (seulement en production, et si l'hébergeur donne l'adresse)
    const ip = ipDuClient(request);
    if (process.env.NODE_ENV === "production" && ip) {
      const attente = limiteur(ip);
      if (attente) {
        return erreur("Trop de demandes. Réessayez dans quelques minutes, ou appelez-nous.", 429, { "Retry-After": String(attente) });
      }
    }

    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return erreur("Format de demande non pris en charge.", 415);
    }
    const corpsTexte = await lireTexteLimite(request, TAILLE_MAX);
    if (corpsTexte === null) return erreur("Demande trop volumineuse.", 413);

    let corps;
    try {
      corps = JSON.parse(corpsTexte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = schema.safeParse(corps);
    if (!lecture.success) return erreur(messageErreurReservation(lecture.error), 400);
    const d = lecture.data;

    // Champ piège : seul un robot le remplit. On répond « OK » sans rien enregistrer, pour ne pas l'aider à s'adapter.
    if (d.piege) return Response.json({ ok: true, prix: null }, { headers: SANS_CACHE });

    // Réservations fermées (hors ligne ou vacances) : on le dit clairement et on renvoie vers le téléphone
    const dispo = await lireDisponibilite();
    if (!dispo.ouvert) {
      return Response.json(
        { erreur: "Les réservations en ligne sont fermées pour le moment. Appelez-nous.", ferme: true, message: dispo.message },
        { status: 409, headers: SANS_CACHE },
      );
    }

    // Anti-spam Turnstile
    const verif = await verifierTurnstile(d.jeton, ip);
    if (!verif.ok) {
      console.warn(`[api/bookings] Turnstile refusé (${verif.raison})`);
      return erreur("La vérification de sécurité a échoué. Rechargez la page ou appelez-nous.", 403);
    }

    // Date et heure : heure de Paris -> instant exact, ni dans le passé ni trop lointain
    const pickup = parisVersUtc(d.date, d.heure);
    if (!pickup) return erreur("La date ou l'heure n'est pas valide.", 400);
    const maintenant = Date.now();
    if (pickup.getTime() < maintenant - 5 * 60_000) return erreur("Cette date et cette heure sont déjà passées.", 400);
    if (pickup.getTime() > maintenant + 366 * 86_400_000) return erreur("Cette date est trop lointaine. Appelez-nous.", 400);

    // Prix estimé, calculé ici. Sans coordonnées (adresse écrite à la main), pas d'estimation : le chauffeur confirme.
    // Un arrêt écrit à la main empêche aussi l'estimation, pour ne jamais donner un prix « sans arrêt » trompeur.
    let estimation = null;
    if (avecCoordonnees(d.depart) && avecCoordonnees(d.arrivee) && (!d.arret || avecCoordonnees(d.arret))) {
      try {
        const trajet = await itineraire(d.arret ? [d.depart, d.arret, d.arrivee] : [d.depart, d.arrivee]);
        const prix = calculerPrix({ km: trajet.km, minutes: trajet.minutes, date: d.date, heure: d.heure, tarifs: await lireTarifs() });
        estimation = {
          km: Math.max(1, Math.round(trajet.km)),
          minutes: trajet.minutes,
          prix: prix.prix,
          prixCents: prix.prixCents,
          tarif: prix.tarif,
          duree: prix.duree,
          approximatif: trajet.approximatif,
        };
      } catch (e) {
        console.error("[api/bookings] estimation impossible :", e instanceof Error ? e.message : e);
      }
    }

    // Enregistrement
    const telephone = formaterTelephone(d.telephone);
    const ligne = {
      client_request_id: d.requestId,
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
      est_price_cents: estimation?.prixCents ?? null,
      tarif: estimation?.tarif ?? null,
      est_approximatif: estimation?.approximatif ?? null,
      customer_name: d.nom,
      customer_phone: telephone,
      customer_email: d.email || null,
    };

    const base = supabaseServeur();
    const { data, error } = await base.from("bookings").insert(ligne).select("id").single();
    if (error) {
      // 23505 : cette demande est déjà enregistrée (double appui sur « Envoyer ») : on ne la refait pas.
      if (error.code === "23505") return Response.json({ ok: true, prix: estimation?.prix ?? null, doublon: true }, { headers: SANS_CACHE });
      console.error("[api/bookings] enregistrement impossible :", error.code, error.message);
      return erreur("Impossible d'enregistrer la demande pour le moment. Appelez-nous.", 500);
    }

    // Alertes au chauffeur : Telegram et e-mail en parallèle. Une alerte qui échoue ne fait pas échouer la demande,
    // qui est déjà enregistrée ; on garde la trace du résultat pour que l'espace chauffeur puisse le signaler.
    const alertes = composerAlertes({
      nom: d.nom,
      telephone,
      quand: dateLisibleParis(pickup),
      depart: d.depart.label,
      arret: d.arret?.label,
      arrivee: d.arrivee.label,
      passagers: d.passagers,
      bagages: d.bagages,
      conventionne: d.conventionne,
      refTrajet: d.refTrajet,
      estimation,
    });
    const [telegram, mail, push] = await Promise.all([
      envoyerTelegram(alertes.telegram),
      envoyerMail({ a: destinatairesAlertes(), sujet: alertes.sujet, texte: alertes.texte, html: alertes.html }),
      envoyerPush({
        titre: "Nouvelle course",
        texte: `${d.nom} · ${dateLisibleParis(pickup)} · ${d.depart.label} → ${d.arrivee.label}`,
        url: "/admin",
        tag: `course-${data.id}`,
      }),
    ]);
    if (!telegram.ok && !mail.ok && !push.ok) {
      console.error(
        `[api/bookings] AUCUNE alerte envoyée pour la course ${data.id} (telegram : ${telegram.raison}, e-mail : ${mail.raison}, push : ${push.raison})`,
      );
    }
    await base
      .from("bookings")
      .update({ alerts: { telegram: telegram.ok, email: mail.ok, push: push.ok } })
      .eq("id", data.id)
      .then(({ error: e }) => e && console.error("[api/bookings] trace des alertes non enregistrée :", e.message));

    return Response.json({ ok: true, prix: estimation?.prix ?? null }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/bookings] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'envoyer la demande pour le moment. Appelez-nous.", 500);
  }
}
