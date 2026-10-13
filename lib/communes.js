// Pages par commune : adresse (slug), distances et communes voisines. Fonctions pures, sans import : testables avec node.
// Les données (communes, destinations) viennent de site.config.js et sont passées en paramètres.

// "Châlette-sur-Loing" -> "chalette-sur-loing" ; "Saint-Germain-des-Prés" -> "saint-germain-des-pres"
export const slugCommune = (nom) =>
  String(nom).normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export const trouverCommune = (communes, slug) => communes.find((c) => slugCommune(c.nom) === slug) ?? null;

// Distance à vol d'oiseau en km (haversine), puis × 1,25 : la route est plus longue (même coefficient que le reste du site)
export function kmRoute(a, b) {
  const t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t;
  const dLo = (b.lon - a.lon) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.25;
}

// "à 4 km", "à 15 km", "à moins de 2 km" : arrondi lisible, jamais « 0 km »
export function distanceLisible(km) {
  if (km < 2) return "à moins de 2 km";
  if (km < 20) return `à ${Math.round(km)} km`;
  return `à environ ${Math.round(km / 5) * 5} km`;
}

// Les n communes les plus proches de `commune` (hors elle-même)
export function voisines(communes, commune, n = 6) {
  return communes
    .filter((c) => c.nom !== commune.nom)
    .map((c) => ({ ...c, km: kmRoute(commune, c) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}
