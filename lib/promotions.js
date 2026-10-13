// Promotions : quelle remise s'applique à une course, et validation de ce que saisit le patron.
// Sans import du projet : testable avec node.
import { lireDate } from "./pricing.js";

export const PORTEES = {
  all: "Toutes les courses",
  gares_aeroports: "Gares et aéroports",
  longue_distance: "Longue distance (50 km et plus)",
};
export const SEUIL_LONGUE_DISTANCE_KM = 50;

const sansAccent = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

// Le trajet va-t-il vers (ou part de) une gare ou un aéroport ? On lit le texte des adresses.
export function estGareOuAeroport(texte) {
  return /\b(gare|aeroport|aerogare|orly|roissy|cdg|beauvais|tgv)\b/.test(sansAccent(texte));
}

function dansLesDates(p, jour) {
  if (p.starts_on && jour < p.starts_on) return false;
  if (p.ends_on && jour > p.ends_on) return false;
  return true;
}

function portee(p, { km, depart, arrivee }) {
  if (p.scope === "gares_aeroports") return estGareOuAeroport(depart) || estGareOuAeroport(arrivee);
  if (p.scope === "longue_distance") return Number(km) >= SEUIL_LONGUE_DISTANCE_KM;
  return p.scope === "all";
}

// promos : lignes de la table `promotions`. ctx : { km, depart, arrivee (textes), jour ("YYYY-MM-DD", jour de la course à Paris) }
// code : texte saisi par le client (facultatif).
// Renvoie { promo, codeInvalide }. La meilleure remise gagne, les remises ne s'additionnent pas.
//  - une promotion SANS code s'applique toute seule ; une promotion AVEC code ne s'applique que si le client le saisit
//  - codeInvalide : le client a saisi un code qui ne donne droit à rien (inconnu, périmé, ou qui ne vaut pas pour ce trajet)
export function choisirPromotion(promos, ctx, code = "") {
  const saisi = String(code ?? "").trim().toLowerCase();
  const valables = (promos ?? []).filter((p) => p.active && dansLesDates(p, ctx.jour) && portee(p, ctx));
  const candidates = valables.filter((p) => !p.code || (saisi && p.code.toLowerCase() === saisi));
  const promo = candidates.reduce((meilleure, p) => (!meilleure || p.percent > meilleure.percent ? p : meilleure), null);
  const codeValide = saisi && valables.some((p) => p.code && p.code.toLowerCase() === saisi);
  return { promo, codeInvalide: Boolean(saisi) && !codeValide };
}

// 21220 centimes, 10 % -> { prixCents: 19098, avantCents: 21220 }
export function appliquerRemise(prixCents, percent) {
  return { prixCents: Math.round((prixCents * (100 - percent)) / 100), avantCents: prixCents };
}

const nettoyer = (s) => String(s ?? "").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").replace(/\s+/g, " ").trim();

// Valide une promotion saisie par le patron. Renvoie { ok: true, valeurs } ou { ok: false, erreur }.
export function validerPromotion(corps) {
  const nom = nettoyer(corps?.name);
  if (!nom || nom.length > 100) return { ok: false, erreur: "Donnez un nom à la promotion (100 caractères au plus)." };
  const pourcent = Number(corps?.percent);
  if (!Number.isInteger(pourcent) || pourcent < 1 || pourcent > 90) return { ok: false, erreur: "La remise doit être un nombre entier de 1 à 90 %." };
  if (!Object.hasOwn(PORTEES, corps?.scope)) return { ok: false, erreur: "Choisissez les trajets concernés." };

  const codeBrut = nettoyer(corps?.code);
  if (codeBrut && !/^[A-Za-z0-9_-]{2,30}$/.test(codeBrut)) return { ok: false, erreur: "Le code : 2 à 30 lettres ou chiffres, sans espace." };

  const date = (v) => (v == null || v === "" ? null : typeof v === "string" && lireDate(v) ? v : undefined);
  const debut = date(corps?.starts_on);
  const fin = date(corps?.ends_on);
  if (debut === undefined || fin === undefined) return { ok: false, erreur: "Une date n'est pas valide." };
  if (debut && fin && fin < debut) return { ok: false, erreur: "La date de fin est avant la date de début." };

  return {
    ok: true,
    valeurs: {
      name: nom,
      percent: pourcent,
      scope: corps.scope,
      code: codeBrut ? codeBrut.toUpperCase() : null,
      starts_on: debut,
      ends_on: fin,
      active: corps.active === undefined ? true : Boolean(corps.active),
    },
  };
}
