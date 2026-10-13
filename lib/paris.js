// Date et heure « murales » de Paris (celles que le client tape) -> instant exact (UTC).
// Fonctions pures, sans import. Le serveur tourne en UTC : on ne peut pas se fier à son fuseau.
//
// L'heure d'été change le décalage (+1 h l'hiver, +2 h l'été) : on le lit dans les règles de Paris
// plutôt que de le supposer.

const FORMAT_PARIS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

// Décalage de Paris par rapport à UTC à un instant donné, en minutes (60 ou 120)
function decalageParisMin(instantMs) {
  const p = Object.fromEntries(FORMAT_PARIS.formatToParts(new Date(instantMs)).map((x) => [x.type, Number(x.value)]));
  const commeSiUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((commeSiUtc - Math.floor(instantMs / 1000) * 1000) / 60000);
}

// "2026-10-14", "14:30" -> Date (instant exact), ou null si la date ou l'heure n'existe pas
export function parisVersUtc(date, heure) {
  const d = typeof date === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  const h = typeof heure === "string" ? /^(\d{2}):(\d{2})$/.exec(heure) : null;
  if (!d || !h) return null;
  const [annee, mois, jour, heures, minutes] = [d[1], d[2], d[3], h[1], h[2]].map(Number);
  if (heures > 23 || minutes > 59) return null;
  const verif = new Date(Date.UTC(annee, mois - 1, jour));
  if (verif.getUTCFullYear() !== annee || verif.getUTCMonth() !== mois - 1 || verif.getUTCDate() !== jour) return null;

  const commeSiUtc = Date.UTC(annee, mois - 1, jour, heures, minutes);
  let instant = commeSiUtc - decalageParisMin(commeSiUtc) * 60000;
  // Près d'un changement d'heure, le décalage à l'instant trouvé peut différer : on corrige une fois.
  const decalage = decalageParisMin(instant);
  instant = commeSiUtc - decalage * 60000;
  return new Date(instant);
}

const JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });
const HEURE = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

// Date lisible en heure de Paris : "mercredi 14 octobre à 14 h 30"
export function dateLisibleParis(instant) {
  const [hh, mm] = HEURE.format(instant).split(":");
  return `${JOUR.format(instant)} à ${hh} h ${mm}`;
}

// Heure seule, en heure de Paris : "14 h 30"
export function heureParis(instant) {
  const [hh, mm] = HEURE.format(instant).split(":");
  return `${hh} h ${mm}`;
}

// Jour en heure de Paris, au format "2026-10-14" (« sv-SE » écrit les dates ainsi)
const CLE_JOUR = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });
export const jourParis = (instant) => CLE_JOUR.format(instant);

// "Aujourd'hui", "Demain" ou "mercredi 14 octobre", selon le jour de Paris de `instant` par rapport à `maintenant`
export function libelleJour(instant, maintenant) {
  const jour = jourParis(instant);
  const [a, m, j] = jourParis(maintenant).split("-").map(Number);
  const demain = new Date(Date.UTC(a, m - 1, j + 1)).toISOString().slice(0, 10);
  if (jour === jourParis(maintenant)) return "Aujourd'hui";
  if (jour === demain) return "Demain";
  const long = JOUR.format(instant);
  return long.charAt(0).toUpperCase() + long.slice(1);
}
