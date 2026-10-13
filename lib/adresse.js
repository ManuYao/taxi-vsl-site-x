// Recherche d'adresses et de lieux (gares, hôpitaux...) pour les champs Départ, Arrivée et Arrêt.
//
// Service : géocodage public de la Géoplateforme (IGN). Il remplace api-adresse.data.gouv.fr,
// qui répond encore mais est « décommissionnée » (en-têtes `sunset` du 31/01/2026).
// Vérifié par de vrais appels sur https://data.geopf.fr/geocodage/search :
//  - gratuit, sans clé, 50 requêtes/s par IP ;
//  - CORS ouvert (`access-control-allow-origin: *`) : appel direct depuis le navigateur, pas de proxy ;
//  - réponse GeoJSON, coordonnées [lon, lat] (dans cet ordre) ;
//  - index `address` (adresses, lieux-dits, communes) et `poi` (gares, hôpitaux, mairies... de la BD TOPO).
// Limites du service : q de 3 à 200 caractères qui commence par une lettre ou un chiffre,
// limit de 1 à 50, lat et lon toujours ensemble. Pas de commerces (pharmacies, supermarchés...).
//
// Fonctionne aussi côté serveur (fetch global), par exemple pour géocoder un texte libre.

const URL_SERVICE = "https://data.geopf.fr/geocodage/search";
const MIN_CARACTERES = 3;
const MAX_CARACTERES = 200;
const DELAI_MS = 8000; // en zone rurale le réseau est parfois lent : on abandonne au bout de 8 s
// Lots demandés (max. 50) ; on garde les meilleurs après tri et nettoyage. Plus gros près de la base :
// beaucoup de lieux-dits et de ponts y sont écartés.
const CANDIDATS_PARTOUT = 15;
const CANDIDATS_PROCHE = 20;

// Classement = score du service x poids de proximité x part des mots tapés retrouvés. Le biais lat/lon du
// service est trop faible (« hopital » ne remonte que des hôpitaux lointains) et peut même faire disparaître
// une vraie ville (« sens » ne renvoie rien avec le biais de Montargis). On fait donc deux appels, l'un
// partout sans biais, l'autre près de la base (biais + département), puis on classe nous-mêmes.
const ECHELLE_KM = 35; // le poids passe de 1 (à la base) à son plancher, avec cette échelle de distance
const PLANCHER = 0.45; // rues, lieux-dits, lieux : très loin, un résultat garde 45 % de son score
const PLANCHER_VILLE = 0.7; // communes : on va souvent loin (Paris, Orléans...), donc moins pénalisées
const BONUS_LIEU = 0.1; // les scores des lieux (gares, hôpitaux...) sont plus bas que ceux des adresses
const POIDS_COUVERTURE = 0.4; // un résultat qui retrouve 0 mot tapé sur 2 garde 60 % de son rang
const SEUIL_VILLE = 0.39; // « importance » du service : ~0,4 pour une ville d'environ 10 000 habitants (Paris 0,67 ; Ladon 0,31)

// Lieux utiles pour un taxi. Les autres thèmes sont écartés : ponts, bois, cours d'eau, réservoirs,
// communes (déjà dans les adresses) et lieux-dits (déjà dans les adresses, et trop nombreux).
const THEMES_UTILES = new Set(["transport", "zone d'activité ou d'intérêt", "cimetière"]);
// Dans « transport », seulement ce qu'on peut viser en taxi (pas les parkings, bornes, arrêts de bus, gares de fret...).
const TRANSPORT_UTILE = /^(gare (voyageurs|routière|maritime)|station de (métro|tramway)|aérogare|aérodrome|altiport)/;

const ETIQUETTES = [
  [/^gare (voyageurs|fret)/, "Gare"],
  [/^(aérodrome|aérogare)/, "Aéroport"],
  [/^(hôpital|etablissement hospitalier)/, "Hôpital"],
  [/^enseignement primaire/, "École"],
  [/^culte/, "Lieu de culte"],
  [/^(divers|autre) /, "Lieu"],
  [/^structure d'accueil/, "Accueil"],
];

const sansAccent = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").replace(/’/g, "'").toLowerCase();
const mots = (s) => sansAccent(s).split(/[^a-z0-9]+/).filter(Boolean);
const premier = (v) => [].concat(v ?? [])[0] ?? "";
const majuscule = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Le service refuse un texte qui ne commence pas par une lettre ou un chiffre.
function nettoyer(texte) {
  return String(texte ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .slice(0, MAX_CARACTERES)
    .trim();
}

function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function genreDe(nature) {
  if (/^gare|^station de (métro|tramway)|^arrêt voyageurs/.test(nature)) return "gare";
  if (/aérodrome|aérogare|altiport|héliport/.test(nature)) return "aeroport";
  if (/^hôpital|^etablissement hospitalier/.test(nature)) return "hopital";
  return "lieu";
}

// Adresse, rue, lieu-dit ou commune (index `address`)
function depuisAdresse(p) {
  const lieu = [p.postcode, p.city].filter(Boolean).join(" ");
  if (p.type === "municipality") {
    // Le code postal d'une grande ville est celui de son 1er arrondissement (« 75001 Paris ») : on met le département.
    const dep = p.depcode ?? p.context?.split(",")[0]?.trim();
    const nom = p.city || p.name || p.label;
    return {
      suggestion: { label: dep ? `${nom} (${dep})` : nom, titre: nom, detail: ["Ville", p.context?.split(",")[1]?.trim()].filter(Boolean).join(" · "), type: p.type, genre: "lieu" },
      titre: nom,
      cp: p.postcode ?? "",
      ville: p.city ?? nom,
      grandeVille: Number(p.importance) >= SEUIL_VILLE,
    };
  }
  const titre = p.name || p.label;
  if (!titre) return null;
  return {
    suggestion: { label: p.label || `${titre} ${lieu}`.trim(), titre, detail: (p.type === "locality" ? "Lieu-dit · " : "") + lieu, type: p.type ?? "address", genre: "lieu" },
    titre,
    cp: p.postcode ?? "",
    ville: p.city ?? "",
  };
}

// Lieu nommé (index `poi`) : gare, hôpital, mairie, cimetière...
function depuisPoi(p, motsTapes) {
  const categories = [].concat(p.category ?? []);
  const nature = categories[0] ?? "";
  if (!categories.some((c) => THEMES_UTILES.has(c))) return null;
  if (categories.includes("transport") && !TRANSPORT_UTILE.test(nature)) return null;
  const titre = p.toponym || premier(p.name);
  if (!titre) return null;
  // Le service trouve aussi un lieu par le nom de sa commune (« Amilly » ramène une borne de recharge d'Amilly) :
  // on ne garde que les lieux dont le nom ou le genre commence par un mot tapé (« hopital » trouve un hôpital).
  const motsLieu = mots(`${titre} ${nature}`);
  if (!motsTapes.some((m) => m.length >= 3 && motsLieu.some((w) => w.startsWith(m)))) return null;
  let etiquette = ETIQUETTES.find(([re]) => re.test(nature))?.[1] ?? majuscule(nature);
  if (sansAccent(etiquette) === sansAccent(titre)) etiquette = ""; // « Cimetière » n'a pas besoin de le dire deux fois
  const cp = premier(p.postcode);
  const ville = premier(p.city);
  const lieu = [cp, ville].filter(Boolean).join(" ");
  return {
    suggestion: { label: lieu ? `${titre}, ${lieu}` : titre, titre, detail: [etiquette, lieu].filter(Boolean).join(" · "), type: "poi", genre: genreDe(nature) },
    titre,
    cp,
    ville,
  };
}

// Poids de proximité : 1 à la base, il baisse avec la distance jusqu'à un plancher.
// Une grande ville tapée en entier (« Paris », « Orléans ») n'est jamais pénalisée.
function rangDe(score, type, km, exact) {
  const plancher = type === "municipality" ? PLANCHER_VILLE : PLANCHER;
  const poids = exact ? 1 : plancher + (1 - plancher) * Math.exp(-km / ECHELLE_KM);
  return (score + (type === "poi" ? BONUS_LIEU : 0)) * poids;
}

// Part des mots tapés (3 lettres ou plus, ou des chiffres) qu'on retrouve au début d'un mot du résultat :
// « gare de sens » préfère « Gare de Sens » à « Gare de Montargis ».
function couverture(texte, motsTapes) {
  const utiles = motsTapes.filter((m) => m.length >= 3 || /^d+$/.test(m));
  if (!utiles.length) return 1;
  const motsResultat = mots(texte);
  return utiles.filter((m) => motsResultat.some((w) => w.startsWith(m))).length / utiles.length;
}

function depuisFeature(f, centre, motsTapes) {
  const [lon, lat] = f?.geometry?.coordinates ?? [];
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const p = f.properties ?? {};
  const base = p._type === "poi" ? depuisPoi(p, motsTapes) : depuisAdresse(p);
  if (!base) return null;
  const { type } = base.suggestion;
  const exact = base.grandeVille && mots(base.titre).join(" ") === motsTapes.join(" ");
  const km = centre ? distanceKm(centre, { lat, lon }) : 0;
  const complet = couverture(`${base.suggestion.label} ${base.suggestion.detail}`, motsTapes);
  return {
    suggestion: { ...base.suggestion, lat, lon },
    rang: rangDe(Number(p.score) || 0, type, km, exact) * (1 - POIDS_COUVERTURE + POIDS_COUVERTURE * complet),
    cle: `${sansAccent(base.titre)}|${base.cp}|${sansAccent(base.ville)}`, // pour écarter les doublons
  };
}

// Un appel au service, avec délai maximum. Une annulation par `signal` lève une AbortError ;
// un délai dépassé lève une erreur normale (le formulaire reste utilisable sans suggestions).
async function appeler(url, signal) {
  const ctrl = new AbortController();
  let delaiDepasse = false;
  const minuteur = setTimeout(() => {
    delaiDepasse = true;
    ctrl.abort();
  }, DELAI_MS);
  const relayer = () => ctrl.abort();
  if (signal?.aborted) ctrl.abort();
  else signal?.addEventListener("abort", relayer, { once: true });
  try {
    const rep = await fetch(url, { signal: ctrl.signal });
    if (!rep.ok) throw new Error(`Géocodage : erreur ${rep.status}`);
    return await rep.json();
  } catch (e) {
    if (delaiDepasse) throw new Error("Géocodage : délai dépassé");
    throw e;
  } finally {
    clearTimeout(minuteur);
    signal?.removeEventListener("abort", relayer);
  }
}

function construireUrl(q, limit, centre, departement) {
  const u = new URL(URL_SERVICE);
  u.searchParams.set("q", q);
  u.searchParams.set("index", "address,poi");
  u.searchParams.set("limit", String(limit));
  if (centre) {
    u.searchParams.set("lat", String(centre.lat));
    u.searchParams.set("lon", String(centre.lon));
  }
  if (departement) u.searchParams.set("depcode", departement);
  return u;
}

// Petite mémoire : un retour en arrière dans la saisie ne refait pas d'appel.
const memoire = new Map();
const MEMOIRE_MAX = 60;

/**
 * Cherche des adresses et des lieux.
 * @param {string} texte saisie de l'utilisateur (moins de 3 caractères : tableau vide, sans appel)
 * @param {{ signal?: AbortSignal, proche?: { lat: number, lon: number, departement?: string }, limite?: number }} [options]
 *   `proche` : la base de l'entreprise (site.base) ; ses résultats passent en premier. `departement`
 *   (ex. "45" ou "45,77") limite l'appel « près de la base » à ces départements.
 * @returns {Promise<Array<{ label: string, lat: number, lon: number, type: string, titre: string, detail: string, genre: string }>>}
 *   Objets figés (Object.freeze), car gardés en mémoire.
 *   `label` : texte à mettre dans le champ. `type` : housenumber | street | locality | municipality | poi.
 *   `titre` et `detail` : les deux lignes à afficher. `genre` : gare | aeroport | hopital | lieu (pour l'icône).
 *   Rejette en cas d'erreur réseau ou de service indisponible ; AbortError si `signal` est annulé.
 */
export async function chercherAdresses(texte, { signal, proche, limite = 6 } = {}) {
  if (signal?.aborted) throw new DOMException("Recherche annulée", "AbortError");
  const q = nettoyer(texte);
  if (q.length < MIN_CARACTERES) return [];
  const max = Math.min(Math.max(Math.floor(limite) || 6, 1), 20);

  const centre = Number.isFinite(proche?.lat) && Number.isFinite(proche?.lon) ? { lat: proche.lat, lon: proche.lon } : null;
  const departement = /^[0-9AB]{2,3}(,[0-9AB]{2,3})*$/i.test(proche?.departement ?? "") ? proche.departement : null;

  const cle = [q.toLowerCase(), centre?.lat, centre?.lon, departement, max].join("|");
  if (memoire.has(cle)) return [...memoire.get(cle)];

  const appels = [appeler(construireUrl(q, CANDIDATS_PARTOUT), signal)];
  if (centre || departement) appels.push(appeler(construireUrl(q, CANDIDATS_PROCHE, centre, departement), signal));
  const reponses = await Promise.allSettled(appels);

  if (signal?.aborted) throw new DOMException("Recherche annulée", "AbortError");
  const reussies = reponses.filter((r) => r.status === "fulfilled");
  if (!reussies.length) throw reponses[0].reason;

  const motsTapes = mots(q);
  const candidats = reussies
    .flatMap((r) => r.value.features ?? [])
    .map((f) => depuisFeature(f, centre, motsTapes))
    .filter(Boolean)
    .sort((a, b) => b.rang - a.rang);

  const vus = new Set();
  const liste = [];
  for (const c of candidats) {
    if (vus.has(c.cle)) continue;
    vus.add(c.cle);
    liste.push(Object.freeze(c.suggestion));
    if (liste.length >= max) break;
  }

  // Un seul appel réussi sur deux : résultat partiel, on ne le garde pas en mémoire.
  if (reussies.length === appels.length) {
    memoire.set(cle, liste);
    if (memoire.size > MEMOIRE_MAX) memoire.delete(memoire.keys().next().value);
  }
  return [...liste];
}
