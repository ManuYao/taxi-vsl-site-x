// E-mails via Resend (simple fetch). Ne lève jamais d'erreur : renvoie { ok, raison? }.
//
// RESEND_FROM : l'expéditeur, par exemple « Taxi Dupont <contact@son-domaine.fr> ». Il faut un domaine vérifié chez Resend.
// Sans lui, on utilise l'expéditeur d'essai de Resend, qui n'écrit qu'à l'adresse du compte Resend.
// `a` : une adresse ou une liste d'adresses.

export async function envoyerMail({ a, sujet, texte, html }, { delaiMs = 8000 } = {}) {
  const cle = process.env.RESEND_API_KEY;
  const destinataires = [].concat(a ?? []).filter(Boolean);
  if (!cle || !destinataires.length) return { ok: false, raison: "non configuré" };

  try {
    const reponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || "Alertes Taxi <onboarding@resend.dev>",
        to: destinataires,
        subject: sujet,
        text: texte,
        html,
      }),
      signal: AbortSignal.timeout(delaiMs),
      cache: "no-store",
    });
    if (reponse.ok) return { ok: true };
    const j = await reponse.json().catch(() => ({}));
    return { ok: false, raison: `HTTP ${reponse.status}${j?.name ? ` (${j.name})` : ""}` };
  } catch (e) {
    return { ok: false, raison: e?.name === "TimeoutError" ? "délai dépassé" : "réseau" };
  }
}

// Adresses de l'équipe à prévenir : ALERT_EMAIL, séparées par des virgules.
export function destinatairesAlertes() {
  return (process.env.ALERT_EMAIL ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
