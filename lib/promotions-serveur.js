import "server-only";
import { appliquerRemise, choisirPromotion } from "./promotions";
import { supabaseServeur } from "./supabase";

// Promotions actives, lues dans la base avec une mémoire de 30 secondes. Si la base ne répond pas (ou si la table
// n'existe pas encore) : aucune promotion. Le prix s'affiche alors sans remise, jamais avec une remise inventée.
let memoire = { jusqua: 0, promos: [] };

export function oublierPromotions() {
  memoire = { jusqua: 0, promos: [] };
}

async function lirePromotions() {
  const maintenant = Date.now();
  if (memoire.jusqua <= maintenant) {
    try {
      const { data, error } = await supabaseServeur().from("promotions").select("name, percent, scope, code, starts_on, ends_on, active").eq("active", true);
      if (error) throw error;
      memoire = { jusqua: maintenant + 30_000, promos: data ?? [] };
    } catch (e) {
      console.error("[promotions] lecture impossible, aucune promotion :", e instanceof Error ? e.message : e?.message);
      memoire = { jusqua: maintenant + 10_000, promos: [] };
    }
  }
  return memoire.promos;
}

// Applique la meilleure promotion à un prix calculé par calculerPrix.
//   prix : { prixCents, prix } ; contexte : { km, depart, arrivee (textes des adresses), jour ("YYYY-MM-DD"), code? }
// Renvoie { prixCents, prix, avantCents, avant, promo: { nom, pourcent } | null, codeInvalide }
export async function avecPromotion(prix, { km, depart, arrivee, jour, code }) {
  const { promo, codeInvalide } = choisirPromotion(await lirePromotions(), { km, depart, arrivee, jour }, code);
  if (!promo) return { prixCents: prix.prixCents, prix: prix.prix, avantCents: null, avant: null, promo: null, codeInvalide };
  const remise = appliquerRemise(prix.prixCents, promo.percent);
  const euros = (c) => Math.floor((c + 50) / 100);
  return {
    prixCents: remise.prixCents,
    prix: euros(remise.prixCents),
    avantCents: remise.avantCents,
    avant: euros(remise.avantCents),
    promo: { nom: promo.name, pourcent: promo.percent },
    codeInvalide,
  };
}
