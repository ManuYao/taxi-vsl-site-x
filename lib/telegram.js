// Alerte de secours par Telegram (simple fetch vers l'API des bots).
// TELEGRAM_CHAT_ID peut contenir plusieurs discussions séparées par des virgules (patron + groupe).
// Ne lève jamais d'erreur : renvoie { ok, raison? } pour que l'enregistrement d'une course n'échoue pas à cause d'une alerte.

export async function envoyerTelegram(texteHtml, { delaiMs = 6000 } = {}) {
  const jeton = process.env.TELEGRAM_BOT_TOKEN;
  const discussions = (process.env.TELEGRAM_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!jeton || !discussions.length) return { ok: false, raison: "non configuré" };

  const envois = await Promise.all(
    discussions.map(async (chat) => {
      try {
        const reponse = await fetch(`https://api.telegram.org/bot${jeton}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chat, text: texteHtml, parse_mode: "HTML", disable_web_page_preview: true }),
          signal: AbortSignal.timeout(delaiMs),
          cache: "no-store",
        });
        return reponse.ok ? null : `HTTP ${reponse.status}`;
      } catch (e) {
        return e?.name === "TimeoutError" ? "délai dépassé" : "réseau";
      }
    }),
  );
  const pannes = envois.filter(Boolean);
  // Réussi si au moins une discussion a reçu le message
  return pannes.length < discussions.length ? { ok: true } : { ok: false, raison: pannes[0] };
}
