// Envoi des notifications push : logique pure, sans import du projet (testable avec node).
// Le module web-push et la liste d'abonnements sont donnés en paramètres (lib/push.js les fournit).
// Ne lève jamais d'erreur, et ne met jamais de clé ni de texte d'erreur brut dans les résultats.

export const TTL_SECONDES = 600; // une demande de course doit arriver vite : au bout de 10 minutes, on abandonne
export const DELAI_MS = 8000; // attente maximale par appareil
const URGENCES = ["very-low", "low", "normal", "high"];

// Retire les caractères de contrôle et invisibles, puis coupe sans casser un caractère (emoji compris)
function nettoyer(valeur, max) {
  const t = String(valeur ?? "").replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu, " ").replace(/\s+/g, " ").trim();
  const signes = Array.from(t);
  return signes.length > max ? signes.slice(0, max - 1).join("").trimEnd() + "…" : t;
}

// payload attendu : { titre, texte, url?, tag? }. Renvoie le message à envoyer, ou null s'il est inutilisable.
// L'adresse doit rester dans le site (elle commence par « / », jamais « // »), sinon on retombe sur /admin.
export function preparerPayload(payload) {
  if (!payload || typeof payload !== "object") return null;
  const titre = nettoyer(payload.titre, 80);
  if (!titre) return null;
  const url = typeof payload.url === "string" && /^\/(?![/\\])[^\s]{0,199}$/.test(payload.url) ? payload.url : "/admin";
  return { titre, texte: nettoyer(payload.texte, 240), url, tag: nettoyer(payload.tag, 80) };
}

const abonnementValide = (a) =>
  a &&
  typeof a.endpoint === "string" && a.endpoint.startsWith("https://") &&
  typeof a.p256dh === "string" && a.p256dh &&
  typeof a.auth === "string" && a.auth;

// Un échec d'envoi ramené à un libellé fixe et sûr (jamais le message brut de l'erreur)
function expliquer(e) {
  if (typeof e?.statusCode === "number") return `HTTP ${e.statusCode}`;
  if (e?.name === "TimeoutError" || e?.message === "Socket timeout") return "délai dépassé";
  if (typeof e?.code === "string" && /^E[A-Z]+$/.test(e.code)) return "réseau";
  return "erreur d'envoi";
}

// Envoie le message à chaque abonnement, en parallèle.
//   webpush      : le module « web-push » (déjà configuré avec les clés VAPID)
//   abonnements  : [{ endpoint, p256dh, auth }]
//   payload      : { titre, texte, url?, tag? }
//   options      : { delaiMs, ttlSecondes, urgence } (facultatif)
// Renvoie { ok, envoyes, expires, echecs, raisons, raison? }
//   ok      : au moins un appareil a été joint
//   expires : adresses (endpoint) à supprimer de la base, car le navigateur répond 404 ou 410
//   raisons : nombre d'échecs par cause, par exemple { "HTTP 500": 1, "délai dépassé": 2 }
export async function envoyerVersAbonnements({ webpush, abonnements, payload, options = {} } = {}) {
  const resultat = { ok: false, envoyes: 0, expires: [], echecs: 0, raisons: {} };
  try {
    const message = preparerPayload(payload);
    if (!message) return { ...resultat, raison: "message invalide" };
    if (typeof webpush?.sendNotification !== "function") return { ...resultat, raison: "web-push indisponible" };

    const delaiMs = Number.isFinite(options.delaiMs) && options.delaiMs > 0 ? options.delaiMs : DELAI_MS;
    const ttl = Number.isFinite(options.ttlSecondes) && options.ttlSecondes >= 0 ? Math.floor(options.ttlSecondes) : TTL_SECONDES;
    const urgence = URGENCES.includes(options.urgence) ? options.urgence : "high";
    const corps = JSON.stringify(message);

    const liste = [];
    const vus = new Set();
    for (const a of Array.isArray(abonnements) ? abonnements : []) {
      if (!abonnementValide(a)) {
        resultat.echecs += 1;
        resultat.raisons["abonnement invalide"] = (resultat.raisons["abonnement invalide"] ?? 0) + 1;
      } else if (!vus.has(a.endpoint)) {
        vus.add(a.endpoint);
        liste.push(a);
      }
    }
    if (!liste.length) return { ...resultat, raison: "aucun abonné" };

    const issues = await Promise.all(
      liste.map(async (a) => {
        let minuteur;
        try {
          const envoi = webpush.sendNotification(
            { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
            corps,
            { TTL: ttl, urgency: urgence, timeout: delaiMs },
          );
          // web-push ne coupe qu'une connexion qui ne répond plus : on borne aussi la durée totale
          const limite = new Promise((_, rejeter) => {
            minuteur = setTimeout(() => rejeter(Object.assign(new Error("délai"), { name: "TimeoutError" })), delaiMs);
          });
          await Promise.race([envoi, limite]);
          return { statut: "envoye" };
        } catch (e) {
          if (e?.statusCode === 404 || e?.statusCode === 410) return { statut: "expire", endpoint: a.endpoint };
          return { statut: "echec", raison: expliquer(e) };
        } finally {
          clearTimeout(minuteur);
        }
      }),
    );

    for (const i of issues) {
      if (i.statut === "envoye") resultat.envoyes += 1;
      else if (i.statut === "expire") resultat.expires.push(i.endpoint);
      else {
        resultat.echecs += 1;
        resultat.raisons[i.raison] = (resultat.raisons[i.raison] ?? 0) + 1;
      }
    }
    resultat.ok = resultat.envoyes > 0;
    return resultat;
  } catch {
    return { ...resultat, raison: "erreur inattendue" };
  }
}
