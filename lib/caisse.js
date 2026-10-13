// Caisse : totaux, validation d'un paiement, export CSV pour le comptable. Sans import du projet : testable avec node.
import { jourParis } from "./paris.js";
import { lireMontant } from "./reglages.js";

export const MODES = { especes: "Espèces", carte: "Carte", tiers_payant: "Tiers payant", virement: "Virement" };
export const MONTANT_MAX = 3000; // euros : au-delà, c'est sûrement une faute de frappe

// 3 -> 0,03 ; 21220 -> 212,20 (pour le CSV, sans espace ni symbole)
export const centimesEnTexte = (c) => (c / 100).toFixed(2).replace(".", ",");

// 21220 -> "212,20 €" (pour l'écran)
export const eurosTxt = (c) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

// Les n jours (au format "2026-10-14") qui se terminent à `jour` inclus, du plus ancien au plus récent
export function joursPrecedents(jour, n) {
  const [a, m, j] = jour.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(a, m - 1, j - (n - 1 - i))).toISOString().slice(0, 10));
}

const sommeParMode = (lignes) => {
  const parMode = Object.fromEntries(Object.keys(MODES).map((m) => [m, 0]));
  for (const p of lignes) parMode[p.mode] += p.amount_cents;
  return parMode;
};
const total = (lignes) => lignes.reduce((s, p) => s + p.amount_cents, 0);

// paiements : lignes de la table `payments` { mode, amount_cents, status: "paid" | "pending", paid_at }
// Renvoie les chiffres de l'écran « Caisse » (jours et mois comptés à l'heure de Paris).
//  - aujourdhui / mois / sept : ce qui est ENCAISSÉ (status « paid », à sa date de paiement)
//  - enAttente : le tiers payant à recevoir (status « pending »), quelle que soit la date
export function resumerCaisse(paiements, maintenant = new Date()) {
  const aujourdhui = jourParis(maintenant);
  const mois = aujourdhui.slice(0, 7);
  const payes = paiements.filter((p) => p.status === "paid" && p.paid_at);
  const duJour = payes.filter((p) => jourParis(new Date(p.paid_at)) === aujourdhui);
  const duMois = payes.filter((p) => jourParis(new Date(p.paid_at)).slice(0, 7) === mois);
  const attente = paiements.filter((p) => p.status === "pending");
  return {
    aujourdhui: { total: total(duJour), nombre: duJour.length, parMode: sommeParMode(duJour) },
    mois: { total: total(duMois), nombre: duMois.length, parMode: sommeParMode(duMois) },
    enAttente: { total: total(attente), nombre: attente.length },
    sept: joursPrecedents(aujourdhui, 7).map((jour) => ({ jour, total: total(payes.filter((p) => jourParis(new Date(p.paid_at)) === jour)) })),
  };
}

// Valide un paiement saisi par le chauffeur. Renvoie { ok: true, valeurs: { bookingId, mode, amountCents } } ou { ok: false, erreur }.
export function validerPaiement(corps) {
  if (typeof corps?.bookingId !== "string" || !/^[0-9a-f-]{36}$/i.test(corps.bookingId)) return { ok: false, erreur: "Course introuvable." };
  if (!Object.hasOwn(MODES, corps?.mode)) return { ok: false, erreur: "Choisissez le mode de paiement." };
  const montant = lireMontant(corps?.montant);
  if (montant === null || montant <= 0) return { ok: false, erreur: "Écrivez le montant encaissé, par exemple 25,50." };
  if (montant > MONTANT_MAX) return { ok: false, erreur: `${montant} € semble beaucoup trop élevé. Vérifiez le montant.` };
  return { ok: true, valeurs: { bookingId: corps.bookingId, mode: corps.mode, amountCents: Math.round(montant * 100) } };
}

// Cellule de CSV pour Excel (séparateur « ; ») : guillemets si besoin, et une apostrophe devant =, +, -, @ pour qu'un nom
// de client ne puisse jamais être exécuté comme une formule.
export function csvCellule(valeur) {
  let t = String(valeur ?? "").replace(/\r?\n/g, " ");
  if (/^[=+\-@\t]/.test(t)) t = `'${t}`;
  return /[;"]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

// BOM au début : Excel lit alors correctement les accents
export function construireCsv(entetes, lignes) {
  return "﻿" + [entetes, ...lignes].map((l) => l.map(csvCellule).join(";")).join("\r\n") + "\r\n";
}
