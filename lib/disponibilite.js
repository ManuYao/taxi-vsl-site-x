// Disponibilité du service : en ligne, hors ligne, ou vacances (avec dates). Sans import du projet : testable avec node.
import { jourParis } from "./paris.js";

// ligne : { state: "online" | "offline" | "vacances", date_from, date_to, message } (colonnes de la table `availability`)
// maintenant : une Date. Renvoie { ouvert, etat, message, jusquau } où `etat` est ce qui est RÉELLEMENT en vigueur :
//   - « vacances » ne s'applique qu'entre date_from et date_to (inclus, jours de Paris) ; avant ou après, le service est en ligne
//   - une ligne absente ou illisible = en ligne (on ne ferme jamais le site par erreur)
export function etatEffectif(ligne, maintenant = new Date()) {
  const ouvert = { ouvert: true, etat: "online", message: "", jusquau: null };
  if (!ligne || typeof ligne !== "object") return ouvert;
  const message = typeof ligne.message === "string" ? ligne.message.trim() : "";

  if (ligne.state === "offline") return { ouvert: false, etat: "offline", message, jusquau: null };

  if (ligne.state === "vacances") {
    const aujourdhui = jourParis(maintenant); // "2026-10-14"
    const debut = ligne.date_from || null;
    const fin = ligne.date_to || null;
    if (debut && aujourdhui < debut) return ouvert; // les vacances n'ont pas commencé
    if (fin && aujourdhui > fin) return ouvert; // elles sont finies : retour automatique
    return { ouvert: false, etat: "vacances", message, jusquau: fin };
  }
  return ouvert;
}

// Valide ce que le patron ou le chauffeur envoie pour changer l'état. Renvoie { ok, valeurs } ou { ok: false, erreur }.
export function validerDisponibilite(corps) {
  const etats = ["online", "offline", "vacances"];
  if (!corps || !etats.includes(corps.state)) return { ok: false, erreur: "État inconnu." };
  const date = (v) => (v == null || v === "" ? null : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : undefined);
  const debut = date(corps.date_from);
  const fin = date(corps.date_to);
  if (debut === undefined || fin === undefined) return { ok: false, erreur: "Une date n'est pas valide." };
  if (corps.state === "vacances" && debut && fin && fin < debut) return { ok: false, erreur: "La date de retour est avant la date de départ." };
  const message = typeof corps.message === "string" ? corps.message.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").replace(/\s+/g, " ").trim() : "";
  if (message.length > 300) return { ok: false, erreur: "Le message est trop long (300 caractères au plus)." };
  return {
    ok: true,
    // les dates et le message ne servent que pour « vacances » ; le message peut aussi accompagner « hors ligne »
    valeurs: {
      state: corps.state,
      date_from: corps.state === "vacances" ? debut : null,
      date_to: corps.state === "vacances" ? fin : null,
      message: corps.state === "online" ? null : message || null,
    },
  };
}
