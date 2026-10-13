// POST /api/estimate : distance, durée et prix estimé d'une course.
// Tout se calcule ici, côté serveur : le navigateur n'a ni la clé OpenRouteService ni la logique de prix.
//
// Corps JSON (Content-Type: application/json) :
//   { depart: { lat, lon, label? }, arrivee: { lat, lon, label? }, arret?: { lat, lon, label? },
//     date: "YYYY-MM-DD", heure: "HH:MM" }   <- heure murale de Paris, telle que saisie par le client
// Réponse 200 : { km, minutes, duree, prix, prixCents, tarif, approximatif, arret }
// Erreur : { erreur: "message court en français" } avec le code 400, 413, 415, 429 ou 500
import { z } from "zod";
import site from "@/site.config";
import { calculerPrix, lireDate, lireHeure } from "@/lib/pricing";
import { itineraire } from "@/lib/routing";

const TAILLE_MAX = 4096; // octets : une demande normale pèse moins de 1 Ko
const LIMITE = { demandes: 30, fenetreMs: 60_000 }; // par adresse IP et par minute
const SANS_CACHE = { "Cache-Control": "no-store" };

// Garde-fou large : France métropolitaine (Corse comprise) avec de la marge.
const point = z.object({
  lat: z.number().min(41).max(52),
  lon: z.number().min(-5.5).max(10),
  label: z.string().max(200).optional(),
});

const schema = z.object({
  depart: point,
  arrivee: point,
  arret: point.nullish(),
  date: z.string().refine((d) => lireDate(d) !== null), // vraie date du calendrier
  heure: z.string().refine((h) => lireHeure(h) !== null), // 00:00 à 23:59
});

const MESSAGES = {
  depart: "Adresse de départ invalide.",
  arrivee: "Adresse d'arrivée invalide.",
  arret: "Adresse de l'arrêt invalide.",
  date: "Date invalide.",
  heure: "Heure invalide.",
};

// Message court pour le client. On ne renvoie jamais le détail de l'erreur ni la valeur reçue.
function messageErreur(echec) {
  const { path, code } = echec.issues[0];
  if ((path[1] === "lat" || path[1] === "lon") && (code === "too_small" || code === "too_big")) {
    return "Adresse hors de France métropolitaine.";
  }
  return MESSAGES[path[0]] ?? "Demande invalide.";
}

// Réponse d'erreur : { erreur: "message court" }
const erreur = (message, status, headers) =>
  Response.json({ erreur: message }, { status, headers: { ...SANS_CACHE, ...headers } });

// Limite simple par adresse IP, en mémoire : elle freine un script qui boucle (et protège le quota ORS).
// Elle vaut par instance du serveur et ne remplace pas Turnstile (à venir).
// Inactive hors production (en développement on enchaîne vite les essais) et sans adresse IP connue.
const visites = new Map(); // ip -> { debut, nombre }
const VISITES_MAX = 2000;

function ipDuClient(request) {
  const h = request.headers;
  return h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || null;
}

// Renvoie le nombre de secondes à attendre, ou 0 si la demande peut passer.
function secondesAAttendre(ip) {
  const maintenant = Date.now();
  if (visites.size >= VISITES_MAX) {
    for (const [cle, v] of visites) if (maintenant - v.debut >= LIMITE.fenetreMs) visites.delete(cle);
    if (visites.size >= VISITES_MAX) visites.clear(); // plutôt que de grossir sans fin
  }
  const v = visites.get(ip);
  if (!v || maintenant - v.debut >= LIMITE.fenetreMs) {
    visites.set(ip, { debut: maintenant, nombre: 1 });
    return 0;
  }
  v.nombre += 1;
  return v.nombre > LIMITE.demandes ? Math.ceil((v.debut + LIMITE.fenetreMs - maintenant) / 1000) : 0;
}

// Lit le corps en s'arrêtant dès que la taille maximale est dépassée (renvoie null dans ce cas).
async function lireTexte(request, max) {
  if (Number(request.headers.get("content-length")) > max) return null;
  if (!request.body) return "";
  const lecteur = request.body.getReader();
  const decodeur = new TextDecoder();
  let texte = "";
  let octets = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    octets += value.byteLength;
    if (octets > max) {
      await lecteur.cancel();
      return null;
    }
    texte += decodeur.decode(value, { stream: true });
  }
  return texte + decodeur.decode();
}

export async function POST(request) {
  try {
    const ip = process.env.NODE_ENV === "production" ? ipDuClient(request) : null;
    const attente = ip ? secondesAAttendre(ip) : 0;
    if (attente) {
      return erreur("Trop de demandes. Réessayez dans un instant.", 429, { "Retry-After": String(attente) });
    }

    // TODO Turnstile : à vérifier ici quand l'anti-spam sera en place.
    if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
      return erreur("Format de demande non pris en charge.", 415);
    }
    const texte = await lireTexte(request, TAILLE_MAX);
    if (texte === null) return erreur("Demande trop volumineuse.", 413);

    let corps;
    try {
      corps = JSON.parse(texte);
    } catch {
      return erreur("Demande illisible.", 400);
    }
    const lecture = schema.safeParse(corps);
    if (!lecture.success) return erreur(messageErreur(lecture.error), 400);
    const { depart, arrivee, arret, date, heure } = lecture.data;

    // Avec un arrêt, l'itinéraire passe par lui : départ→arrêt + arrêt→arrivée.
    const trajet = await itineraire(arret ? [depart, arret, arrivee] : [depart, arrivee]);
    const prix = calculerPrix({ km: trajet.km, minutes: trajet.minutes, date, heure, tarifs: site.tarifs });

    // km est arrondi au km pour l'affichage (« 107 km », comme la maquette) ; le prix, lui, est calculé au dixième de km.
    return Response.json(
      {
        km: Math.max(1, Math.round(trajet.km)),
        minutes: trajet.minutes,
        duree: prix.duree, // même texte que dureeLisible(minutes) de lib/dates.js
        prix: prix.prix, // euros entiers : « ≈ 218 € »
        prixCents: prix.prixCents,
        tarif: prix.tarif, // "jour" | "nuit"
        approximatif: trajet.approximatif, // true : ORS indisponible, estimation à vol d'oiseau
        arret: Boolean(arret),
      },
      { headers: SANS_CACHE },
    );
  } catch (e) {
    console.error("[api/estimate] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Le prix n'a pas pu être calculé. Réessayez.", 500);
  }
}
