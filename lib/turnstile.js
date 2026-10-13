// Vérifie côté serveur le jeton Cloudflare Turnstile reçu avec le formulaire (anti-spam).
// La clé secrète reste ici : le navigateur n'a que la clé publique.
const URL_VERIF = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Renvoie { ok, raison? }. Sans clé secrète : refusé en production, ignoré en développement.
export async function verifierTurnstile(jeton, ip, { delaiMs = 8000 } = {}) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return { ok: false, raison: "non configuré" };
    console.warn("[turnstile] TURNSTILE_SECRET_KEY absente : vérification ignorée (développement seulement).");
    return { ok: true, ignoree: true };
  }
  if (!jeton) return { ok: false, raison: "jeton absent" };
  try {
    const reponse = await fetch(URL_VERIF, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: jeton, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(delaiMs),
      cache: "no-store",
    });
    if (!reponse.ok) return { ok: false, raison: `HTTP ${reponse.status}` };
    const j = await reponse.json();
    return j.success === true ? { ok: true } : { ok: false, raison: (j["error-codes"] ?? []).join(",") || "refusé" };
  } catch (e) {
    return { ok: false, raison: e?.name === "TimeoutError" ? "délai dépassé" : "réseau" };
  }
}
