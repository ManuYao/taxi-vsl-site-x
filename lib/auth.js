import "server-only";
import { supabaseServeur } from "./supabase";

// Vérifie qu'une requête de l'espace chauffeur vient d'une personne connectée ET membre actif de l'équipe
// (table « staff »). Le navigateur envoie son jeton de connexion dans l'en-tête Authorization: Bearer <jeton>.
// À appeler au début de chaque route réservée à l'équipe.
//
// Renvoie { ok: true, user: { id, email }, role: "patron" | "chauffeur", nom }
//      ou { ok: false, status, erreur } : à renvoyer tel quel au navigateur.
export async function exigerEquipe(request) {
  const jeton = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton) return { ok: false, status: 401, erreur: "Connexion requise." };

  const base = supabaseServeur();
  const { data, error } = await base.auth.getUser(jeton);
  if (error || !data?.user) return { ok: false, status: 401, erreur: "Session expirée. Reconnectez-vous." };

  const { data: fiche, error: erreurFiche } = await base
    .from("staff")
    .select("role, display_name, active")
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (erreurFiche) {
    console.error("[auth] lecture de l'équipe impossible :", erreurFiche.message);
    return { ok: false, status: 500, erreur: "Vérification impossible pour le moment." };
  }
  if (!fiche?.active) return { ok: false, status: 403, erreur: "Ce compte n'a pas accès à l'espace chauffeur." };

  return { ok: true, user: { id: data.user.id, email: data.user.email }, role: fiche.role, nom: fiche.display_name };
}
