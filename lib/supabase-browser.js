import { createClient } from "@supabase/supabase-js";

// Accès à la base depuis le navigateur de l'espace chauffeur, avec la clé PUBLIQUE et la session de la personne connectée.
// Ce que cette personne peut lire ou modifier est décidé par les règles d'accès de la base (supabase/schema.sql),
// pas par ce code : sans compte d'équipe, la base répond « permission refusée ».
let client;

export function supabaseNavigateur() {
  client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
