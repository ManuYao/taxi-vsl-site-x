// Prix estimé d'une course. Fonctions pures, sans import : les tarifs sont passés en paramètre
// ({ priseEnCharge, kmJour, kmNuit, minimum }, en euros), ce qui permet de les tester avec node.
//
// La date ("YYYY-MM-DD") et l'heure ("HH:MM") sont l'heure MURALE de Paris, telle que saisie par
// le client. Aucune conversion de fuseau : le serveur tourne en UTC, ça fausserait le résultat.

// À CONFIRMER AVEC LE CLIENT : quand le tarif de nuit (kmNuit) s'applique-t-il ?
// Règle actuelle (CLAUDE.md) : départ avant 7 h, à partir de 19 h, et tout le dimanche.
// Seule l'heure de départ compte. Les jours fériés ne sont pas gérés.
// Pour changer la règle, il suffit de modifier cet objet (ou de passer une autre `regle`).
export const REGLE_NUIT = Object.freeze({
  avant: 7, // départ avant 7 h 00 : tarif de nuit
  apres: 19, // départ à 19 h 00 ou plus tard : tarif de nuit
  dimanche: true, // dimanche, toute la journée : tarif de nuit
});

// "2026-10-18" -> { annee, mois, jour, jourSemaine } (0 = dimanche … 6 = samedi), sinon null.
// Le jour de la semaine est calculé en UTC à partir des chiffres : ni le fuseau du serveur
// ni l'heure d'été n'entrent en jeu (new Date("2026-10-18").getDay() donnerait samedi à Los Angeles).
export function lireDate(texte) {
  const m = typeof texte === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(texte) : null;
  if (!m) return null;
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(annee, mois - 1, jour));
  // Date.UTC « corrige » les dates impossibles (31 février -> 3 mars) et lit 0050 comme 1950 : on les refuse.
  if (d.getUTCFullYear() !== annee || d.getUTCMonth() !== mois - 1 || d.getUTCDate() !== jour) return null;
  return { annee, mois, jour, jourSemaine: d.getUTCDay() };
}

// "07:05" -> { heures: 7, minutes: 5 }, sinon null
export function lireHeure(texte) {
  const m = typeof texte === "string" ? /^(\d{2}):(\d{2})$/.exec(texte) : null;
  if (!m) return null;
  const [heures, minutes] = [Number(m[1]), Number(m[2])];
  return heures <= 23 && minutes <= 59 ? { heures, minutes } : null;
}

// "jour" ou "nuit", d'après la date et l'heure de départ
export function choisirTarif(date, heure, regle = REGLE_NUIT) {
  const d = lireDate(date);
  const h = lireHeure(heure);
  if (!d) throw new RangeError("Date invalide");
  if (!h) throw new RangeError("Heure invalide");
  if (regle.dimanche && d.jourSemaine === 0) return "nuit";
  const minutes = h.heures * 60 + h.minutes;
  return minutes < regle.avant * 60 || minutes >= regle.apres * 60 ? "nuit" : "jour";
}

// 95 -> "1 h 35", 40 -> "40 min", 120 -> "2 h" (arrondi à 5 minutes, comme dureeLisible dans lib/dates.js).
// Renvoie null si la durée est inconnue.
export function libelleDuree(minutes) {
  if (!Number.isFinite(minutes) || minutes < 0) return null;
  const m = Math.max(5, Math.round(minutes / 5) * 5);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const reste = m % 60;
  return reste ? `${h} h ${String(reste).padStart(2, "0")}` : `${h} h`;
}

const CLES_TARIFS = ["priseEnCharge", "kmJour", "kmNuit", "minimum"];

// Euros -> centimes entiers (Math.round évite 4.1 * 100 = 409.99999999999994)
function tarifsEnCentimes(tarifs) {
  const c = {};
  for (const cle of CLES_TARIFS) {
    const euros = tarifs?.[cle];
    if (!Number.isFinite(euros) || euros < 0) throw new RangeError(`Tarif invalide : ${cle}`);
    c[cle] = Math.round(euros * 100);
  }
  return c;
}

// Prix d'une course : max(minimum, priseEnCharge + km × tarifKm), calculé en centimes entiers.
//   km      distance totale ; avec un arrêt : départ→arrêt + arrêt→arrivée. Prise au dixième de km.
//   minutes durée en minutes (facultatif, seulement pour le libellé)
//   date, heure : heure murale de Paris du départ ; tarifs : en euros ; regle : REGLE_NUIT par défaut
// Renvoie { prixCents, prix, tarif, duree } :
//   prixCents  prix exact, en centimes (entier)
//   prix       prix arrondi à l'euro, pour l'affichage (« ≈ 218 € »)
//   tarif      "jour" | "nuit"
//   duree      libellé ("1 h 35") ou null
// Lève une RangeError si une entrée est invalide : valider avant d'appeler.
export function calculerPrix({ km, minutes, date, heure, tarifs, regle = REGLE_NUIT }) {
  if (!Number.isFinite(km) || km < 0) throw new RangeError("Distance invalide");
  const c = tarifsEnCentimes(tarifs);
  const tarif = choisirTarif(date, heure, regle);
  const dixiemes = Math.round(km * 10); // distance en dixièmes de km : un entier, donc pas d'erreur de flottant
  const parKm = tarif === "nuit" ? c.kmNuit : c.kmJour;
  const prixCents = Math.max(c.minimum, c.priseEnCharge + Math.round((dixiemes * parKm) / 10));
  return { prixCents, prix: Math.floor((prixCents + 50) / 100), tarif, duree: libelleDuree(minutes) };
}
