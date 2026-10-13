import "server-only";
import { createClient } from "@supabase/supabase-js";

// Accès à la base avec la clé SECRÈTE (SUPABASE_SERVICE_ROLE_KEY) : elle passe outre les règles d'accès.
// À n'utiliser que dans les routes de l'API et le code serveur, jamais côté navigateur
// (« server-only » fait échouer la construction du site si ce fichier est importé par erreur dans un composant client).
let client;

export function supabaseServeur() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !cle) throw new Error("Supabase n'est pas configuré (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
  client ??= createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
