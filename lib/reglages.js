// Tarifs du chauffeur : validation et fusion avec ceux de site.config.js. Sans import du projet : testable avec node.

const CHAMPS = {
  priseEnCharge: { libelle: "la prise en charge", max: 100 },
  kmJour: { libelle: "le prix du km de jour", max: 30 },
  kmNuit: { libelle: "le prix du km de nuit ou dimanche", max: 30 },
  minimum: { libelle: "le prix minimum d'une course", max: 300 },
};

// "2,5" ou "2.5" ou 2.5 -> 2.5 ; sinon null. Arrondi au centime.
export function lireMontant(valeur) {
  if (typeof valeur === "number") return Number.isFinite(valeur) ? Math.round(valeur * 100) / 100 : null;
  if (typeof valeur !== "string") return null;
  const t = valeur.trim().replace(",", ".").replace(/\s/g, "");
  if (!/^\d{1,4}(\.\d{1,3})?$/.test(t)) return null;
  return Math.round(Number(t) * 100) / 100;
}

// Renvoie { ok: true, tarifs } ou { ok: false, erreur }
export function validerTarifs(corps) {
  const tarifs = {};
  for (const [cle, { libelle, max }] of Object.entries(CHAMPS)) {
    const v = lireMontant(corps?.[cle]);
    if (v === null) return { ok: false, erreur: `Vérifiez ${libelle} : écrivez un nombre, par exemple 2,50.` };
    if (v > max) return { ok: false, erreur: `Vérifiez ${libelle} : ${v} € semble beaucoup trop élevé.` };
    tarifs[cle] = v;
  }
  if (tarifs.kmNuit < tarifs.kmJour) return { ok: false, erreur: "Le prix du km de nuit ne peut pas être plus bas que celui de jour." };
  return { ok: true, tarifs };
}

// Tarifs en vigueur : ceux enregistrés par le patron s'ils sont valides, sinon ceux de site.config.js.
// `confirmes` vaut true dès que le patron a enregistré ses tarifs (le site cesse alors de les dire « fictifs »).
export function fusionnerTarifs(parDefaut, enregistres) {
  const lecture = validerTarifs(enregistres);
  if (!lecture.ok) return { ...parDefaut };
  return { ...lecture.tarifs, confirmes: true };
}
