// /api/push/subscribe : appareils de l'équipe qui reçoivent les notifications push.
//
// Réservé à l'équipe : en-tête Authorization: Bearer <jeton de connexion Supabase> (voir lib/auth.js).
//   POST   corps JSON { endpoint, keys: { p256dh, auth }, deviceLabel? }   <- PushSubscription.toJSON() du navigateur
//          Enregistre l'appareil pour la personne connectée (même adresse déjà connue : mise à jour).
//   DELETE corps JSON { endpoint }
//          Retire l'appareil de CETTE personne seulement (sans erreur s'il n'existe plus).
// Réponse 200 : { ok: true }
// Erreur : { erreur: "message court en français" } avec le code 400, 401, 403, 413, 415, 429 ou 500
import { z } from "zod";
import { exigerEquipe } from "@/lib/auth";
import { creerLimiteur, ipDuClient, lireTexteLimite } from "@/lib/http";
import { nettoyer } from "@/lib/reservation";
import { supabaseServeur } from "@/lib/supabase";

const TAILLE_MAX = 4096; // octets : un abonnement normal pèse environ 0,5 Ko
const SANS_CACHE = { "Cache-Control": "no-store" };
const limiteur = creerLimiteur({ max: 30, fenetreMs: 10 * 60_000 }); // par adresse IP : 30 appels en 10 minutes

const erreur = (message, status, headers) =>
  Response.json({ erreur: message }, { status, headers: { ...SANS_CACHE, ...headers } });

// L'adresse du service de notification du navigateur (Google, Mozilla, Apple, Microsoft…) : en https, sur le port
// normal, sans identifiant, avec un vrai nom de domaine (ni IP ni « localhost »), puisque c'est le serveur qui l'appellera.
function estAdressePush(valeur) {
  try {
    const u = new URL(valeur);
    return u.protocol === "https:" && !u.username && !u.password && !u.port && u.hostname.includes(".") && !/^[\d.]+$/.test(u.hostname) && !u.hostname.includes(":");
  } catch {
    return false;
  }
}

const adresse = z.string().max(1000).refine(estAdressePush);
const cleBase64 = (tailleOk) =>
  z
    .string()
    .max(200)
    .regex(/^[A-Za-z0-9_-]+$/)
    .refine((v) => tailleOk(Buffer.from(v, "base64url").length));
const etiquette = z.string().max(400).transform(nettoyer).pipe(z.string().max(100));

const schemaAbonnement = z.object({
  endpoint: adresse,
  keys: z.object({
    p256dh: cleBase64((n) => n === 65), // clé publique P-256 du navigateur
    auth: cleBase64((n) => n >= 16), // secret d'authentification (16 octets)
  }),
  deviceLabel: etiquette.nullish(),
});
const schemaRetrait = z.object({ endpoint: adresse });

// Contrôles communs : limite par IP, connexion de l'équipe, format et taille du corps.
// Renvoie { reponse } (à renvoyer tel quel) ou { equipe, corps }.
async function preparer(request) {
  // Limite par IP (seulement en production, et si l'hébergeur donne l'adresse)
  const ip = ipDuClient(request);
  if (process.env.NODE_ENV === "production" && ip) {
    const attente = limiteur(ip);
    if (attente) return { reponse: erreur("Trop de demandes. Réessayez dans quelques minutes.", 429, { "Retry-After": String(attente) }) };
  }

  const equipe = await exigerEquipe(request);
  if (!equipe.ok) return { reponse: erreur(equipe.erreur, equipe.status) };

  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { reponse: erreur("Format de demande non pris en charge.", 415) };
  }
  const texte = await lireTexteLimite(request, TAILLE_MAX);
  if (texte === null) return { reponse: erreur("Demande trop volumineuse.", 413) };
  try {
    return { equipe, corps: JSON.parse(texte) };
  } catch {
    return { reponse: erreur("Demande illisible.", 400) };
  }
}

export async function POST(request) {
  try {
    const { reponse, equipe, corps } = await preparer(request);
    if (reponse) return reponse;

    const lecture = schemaAbonnement.safeParse(corps);
    if (!lecture.success) return erreur("Appareil invalide.", 400);
    const { endpoint, keys, deviceLabel } = lecture.data;

    // Même adresse déjà connue (réabonnement, ou autre personne sur le même téléphone) : on met à jour la ligne
    const { error } = await supabaseServeur()
      .from("push_subscriptions")
      .upsert(
        { user_id: equipe.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth, device_label: deviceLabel || null },
        { onConflict: "endpoint" },
      );
    if (error) {
      console.error("[api/push/subscribe] enregistrement impossible :", error.code, error.message);
      return erreur("Impossible d'enregistrer cet appareil pour le moment.", 500);
    }
    return Response.json({ ok: true }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/push/subscribe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible d'enregistrer cet appareil pour le moment.", 500);
  }
}

export async function DELETE(request) {
  try {
    const { reponse, equipe, corps } = await preparer(request);
    if (reponse) return reponse;

    const lecture = schemaRetrait.safeParse(corps);
    if (!lecture.success) return erreur("Appareil invalide.", 400);

    // Seulement les appareils de cette personne : on ne retire jamais celui d'un collègue
    const { error } = await supabaseServeur()
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", lecture.data.endpoint)
      .eq("user_id", equipe.user.id);
    if (error) {
      console.error("[api/push/subscribe] suppression impossible :", error.code, error.message);
      return erreur("Impossible de retirer cet appareil pour le moment.", 500);
    }
    return Response.json({ ok: true }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/push/subscribe] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de retirer cet appareil pour le moment.", 500);
  }
}
