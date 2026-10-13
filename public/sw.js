// Service worker de l'espace chauffeur (portée /admin, voir components/admin/usePush.js).
// Il sert à recevoir les notifications push quand l'appli est fermée. Il ne met AUCUNE page en cache :
// l'espace chauffeur doit toujours être à jour.

const ICONE = "/icons/icon-192.png";
const BADGE = "/icons/badge-72.png"; // petite icône blanche sur fond transparent (barre d'état Android)
const PAGE_PAR_DEFAUT = "/admin";

// Une adresse de destination reste dans le site : elle commence par « / », jamais « // »
const adresseSure = (u) => (typeof u === "string" && /^\/(?![/\\])\S{0,199}$/.test(u) ? u : PAGE_PAR_DEFAUT);
const texte = (v) => (typeof v === "string" ? v.trim() : "");

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Ne fait rien de spécial : le navigateur traite la requête lui-même (rien n'est mis en cache).
// L'écouteur est là seulement parce que certains navigateurs l'exigent pour proposer l'installation de l'appli.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  // Payload attendu : { titre, texte, url, tag }. On tolère un message absent, en texte brut ou illisible :
  // une notification doit TOUJOURS s'afficher (sinon Safari et Chrome finissent par retirer l'autorisation).
  let donnees = {};
  try {
    if (event.data) {
      try {
        donnees = event.data.json();
      } catch {
        donnees = { texte: event.data.text() };
      }
    }
  } catch {
    donnees = {};
  }
  if (donnees === null || typeof donnees !== "object") donnees = typeof donnees === "string" ? { texte: donnees } : {};

  const titre = texte(donnees.titre) || "Nouvelle notification";
  const tag = texte(donnees.tag);
  const options = {
    body: texte(donnees.texte) || "Ouvrez l'espace chauffeur.",
    icon: ICONE,
    badge: BADGE,
    lang: "fr",
    vibrate: [250, 120, 250, 120, 250],
    requireInteraction: true, // reste affichée jusqu'à ce que le chauffeur la touche
    data: { url: adresseSure(donnees.url), tag },
  };
  // Même tag = la notification est remplacée, et renotify la fait sonner à nouveau.
  // renotify sans tag est une erreur : on ne le met qu'avec un tag.
  if (tag) {
    options.tag = tag;
    options.renotify = true;
  }

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(adresseSure(event.notification.data?.url), self.location.origin).href;
  const tag = event.notification.data?.tag ?? "";

  event.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const ouverte = fenetres.find((f) => new URL(f.url).pathname.startsWith(PAGE_PAR_DEFAUT));
      if (ouverte) {
        // L'espace chauffeur est déjà ouvert : on le met au premier plan, et on prévient la page (elle peut changer d'onglet)
        ouverte.postMessage({ type: "notification-clic", url, tag });
        await ouverte.focus();
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});
