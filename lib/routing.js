// Distance et durée d'un trajet de 2 ou 3 points { lat, lon } : départ, arrêt facultatif, arrivée.
// Fournisseur : OpenRouteService (ORS), clé dans process.env.ORS_API_KEY (jamais dans le code).
// Si la clé manque ou si l'appel échoue : estimation « à vol d'oiseau × 1,25 », marquée approximatif: true.
// Aucun import du projet, pour pouvoir le tester avec node.
//
// ORS (doc officielle lue en octobre 2026) :
//  - POST https://api.openrouteservice.org/v2/directions/driving-car/json
//  - en-tête Authorization = la clé telle quelle, sans « Bearer »
//  - corps { coordinates: [[lon, lat], ...] } : la LONGITUDE vient en premier
//  - réponse : routes[0].summary = { distance (mètres), duration (secondes) } ; avec un arrêt, c'est le total
//  - plan gratuit : 2 000 requêtes par jour et 40 par minute pour Directions
//    au-delà : HTTP 403 (quota du jour) ou 429 (quota de la minute)
//  - une clé ORS appartient à une seule personne : elle ne sert que côté serveur
const URL_ORS = "https://api.openrouteservice.org/v2/directions/driving-car/json";
const DELAI_ORS_MS = 4000; // au-delà, on préfère une estimation plutôt que de faire attendre le client
const COEF_ROUTE = 1.25; // la route est plus longue qu'à vol d'oiseau (même coefficient que components/Zones.js)

const arrondi1 = (x) => Math.round(x * 10) / 10;

// Distance à vol d'oiseau, en km (formule haversine)
export function kmVolDOiseau(a, b) {
  const t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t;
  const dLo = (b.lon - a.lon) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// Repli : vol d'oiseau × 1,25, tronçon par tronçon (départ→arrêt + arrêt→arrivée).
// La durée suit la maquette : 45 km/h sur les petits trajets, 72 km/h à partir de 60 km, plus 5 minutes.
export function itineraireApproximatif(points) {
  let km = 0;
  for (let i = 1; i < points.length; i++) km += kmVolDOiseau(points[i - 1], points[i]) * COEF_ROUTE;
  const vitesse = 45 + (27 * Math.min(km, 60)) / 60; // km/h, qui monte avec la distance
  return { km: arrondi1(km), minutes: Math.round((km / vitesse) * 60 + 5), approximatif: true };
}

// Petit cache en mémoire : le client change l'heure, puis réserve, et la route est la même.
// Il économise le quota ORS ; il vaut par instance du serveur. Seuls les vrais résultats ORS y entrent.
const CACHE_DUREE_MS = 60 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map(); // "lat,lon|lat,lon" -> { jusqua, valeur }
const idTrajet = (points) => points.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join("|");

export const viderCache = () => cache.clear(); // pour les tests

function verifier(points) {
  if (!Array.isArray(points) || points.length < 2 || points.length > 3) throw new RangeError("Il faut 2 ou 3 points");
  for (const p of points) {
    const ok = Number.isFinite(p?.lat) && Number.isFinite(p?.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180;
    if (!ok) throw new RangeError("Point invalide");
  }
}

async function appelerOrs(points, cle, delaiMs) {
  const reponse = await fetch(URL_ORS, {
    method: "POST",
    headers: { Authorization: cle, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      coordinates: points.map((p) => [p.lon, p.lat]), // longitude d'abord
      instructions: false, // seul le total nous intéresse : réponse légère
      geometry: false,
    }),
    signal: AbortSignal.timeout(delaiMs),
    cache: "no-store",
  });
  if (!reponse.ok) throw new Error(`HTTP ${reponse.status}`);
  const { distance, duration } = (await reponse.json())?.routes?.[0]?.summary ?? {};
  if (!Number.isFinite(distance) || !Number.isFinite(duration)) throw new Error("réponse inattendue");
  return { km: arrondi1(distance / 1000), minutes: Math.round(duration / 60), approximatif: false };
}

const motif = (e) => (e?.name === "TimeoutError" ? "délai dépassé" : e?.message || "erreur");
let sansCleSignale = false;

// Renvoie { km, minutes, approximatif } pour l'ensemble du trajet (km au dixième).
// Ne lève d'erreur que si les points sont invalides : toute panne d'ORS donne le repli.
// options.cle : clé ORS (par défaut process.env.ORS_API_KEY) ; options.delaiMs : délai maximum de l'appel ORS.
export async function itineraire(points, { cle = process.env.ORS_API_KEY, delaiMs = DELAI_ORS_MS } = {}) {
  verifier(points);
  if (!cle) {
    if (!sansCleSignale) {
      sansCleSignale = true;
      console.warn("[routing] ORS_API_KEY absente : distances à vol d'oiseau × 1,25 (approximatif).");
    }
    return itineraireApproximatif(points);
  }

  const id = idTrajet(points);
  const connu = cache.get(id);
  if (connu && connu.jusqua > Date.now()) return { ...connu.valeur };

  try {
    const valeur = await appelerOrs(points, cle, delaiMs);
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value); // on retire le plus ancien
    cache.set(id, { jusqua: Date.now() + CACHE_DUREE_MS, valeur });
    return { ...valeur };
  } catch (e) {
    console.warn(`[routing] ORS indisponible (${motif(e)}), repli à vol d'oiseau.`);
    return itineraireApproximatif(points);
  }
}
