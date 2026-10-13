import "server-only";
import site from "@/site.config";
import { fusionnerTarifs } from "./reglages";
import { supabaseServeur } from "./supabase";

// Tarifs en vigueur côté serveur : ceux que le patron a enregistrés (table « settings »), sinon ceux de site.config.js.
// Petite mémoire de 30 secondes. Si la base ne répond pas, on garde les tarifs de site.config.js : une panne
// ne doit jamais empêcher le prix de s'afficher.
let memoire = { jusqua: 0, enregistres: null };

export function oublierReglages() {
  memoire = { jusqua: 0, enregistres: null };
}

export async function lireTarifs() {
  const maintenant = Date.now();
  if (memoire.jusqua <= maintenant) {
    try {
      const { data, error } = await supabaseServeur().from("settings").select("tarifs").eq("id", 1).maybeSingle();
      if (error) throw error;
      memoire = { jusqua: maintenant + 30_000, enregistres: data?.tarifs ?? null };
    } catch (e) {
      console.error("[reglages] lecture des tarifs impossible, tarifs de site.config.js :", e instanceof Error ? e.message : e?.message);
      memoire = { jusqua: maintenant + 10_000, enregistres: null };
    }
  }
  return fusionnerTarifs(site.tarifs, memoire.enregistres);
}
