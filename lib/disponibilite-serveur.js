import "server-only";
import { etatEffectif } from "./disponibilite";
import { supabaseServeur } from "./supabase";

// Lecture de la disponibilité côté serveur, avec une petite mémoire de 10 secondes (le site la demande à chaque visite).
// Si la base ne répond pas (ou si la table n'existe pas encore), on considère que le service est OUVERT :
// une panne ne doit jamais fermer les réservations par erreur.
let memoire = { jusqua: 0, ligne: null };

export function oublierDisponibilite() {
  memoire = { jusqua: 0, ligne: null };
}

export async function lireDisponibilite() {
  const maintenant = Date.now();
  if (memoire.jusqua <= maintenant) {
    try {
      const { data, error } = await supabaseServeur().from("availability").select("state, date_from, date_to, message").eq("id", 1).maybeSingle();
      if (error) throw error;
      memoire = { jusqua: maintenant + 10_000, ligne: data };
    } catch (e) {
      console.error("[disponibilite] lecture impossible, on considère le service ouvert :", e instanceof Error ? e.message : e?.message);
      memoire = { jusqua: maintenant + 5_000, ligne: null };
    }
  }
  return etatEffectif(memoire.ligne, new Date());
}
