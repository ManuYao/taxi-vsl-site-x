import "server-only";
import { avecPromotion } from "./promotions-serveur";
import { calculerPrix } from "./pricing";
import { lireTarifs } from "./reglages-serveur";
import { itineraire } from "./routing";

const avecCoordonnees = (l) => l?.lat !== undefined && l?.lon !== undefined;

// Prix estimé d'une course, calculé côté serveur : itinéraire réel, tarifs du patron, promotion éventuelle.
// Sans coordonnées (adresse écrite à la main), pas d'estimation : on renvoie null et le chauffeur confirme le prix.
// Un arrêt écrit à la main empêche aussi l'estimation, pour ne jamais donner un prix « sans arrêt » trompeur.
// lieux : { label, lat?, lon? } ; date "YYYY-MM-DD" et heure "HH:MM" (heure de Paris) ; codePromo : texte saisi (facultatif).
export async function estimerCourse({ depart, arrivee, arret, date, heure, codePromo }) {
  if (!(avecCoordonnees(depart) && avecCoordonnees(arrivee) && (!arret || avecCoordonnees(arret)))) return null;
  try {
    const trajet = await itineraire(arret ? [depart, arret, arrivee] : [depart, arrivee]);
    const calcule = calculerPrix({ km: trajet.km, minutes: trajet.minutes, date, heure, tarifs: await lireTarifs() });
    // La promotion est recalculée ici : jamais crue sur parole
    const prix = await avecPromotion(calcule, { km: trajet.km, depart: depart.label, arrivee: arrivee.label, jour: date, code: codePromo });
    return {
      km: Math.max(1, Math.round(trajet.km)),
      minutes: trajet.minutes,
      prix: prix.prix,
      prixCents: prix.prixCents,
      prixAvant: prix.avant,
      prixAvantCents: prix.avantCents,
      promo: prix.promo,
      tarif: calcule.tarif,
      duree: calcule.duree,
      approximatif: trajet.approximatif,
    };
  } catch (e) {
    console.error("[estimation] impossible :", e instanceof Error ? e.message : e);
    return null;
  }
}
