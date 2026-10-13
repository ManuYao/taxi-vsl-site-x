"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// Notifications push de l'espace chauffeur (côté navigateur).
//
//   const { etat, activer, desactiver, erreur, occupe } = usePush({ getToken });
//
//   getToken()  : renvoie une promesse du jeton de connexion Supabase (session.access_token)
//   deviceLabel : nom de l'appareil affiché plus tard (facultatif ; par défaut « iPhone · Safari », « Android · Chrome »…)
//
//   etat :
//     "inconnu"       pas encore évalué (affichage serveur, premier rendu)
//     "non-supporte"  ce navigateur ne sait pas faire de notifications push
//     "ios-installer" iPhone/iPad sans l'appli installée : il faut d'abord « Ajouter à l'écran d'accueil » (iOS 16.4 ou plus)
//     "refuse"        l'autorisation est bloquée dans le navigateur (à rétablir dans ses réglages)
//     "inactif"       possible, mais pas encore activé sur cet appareil
//     "actif"         cet appareil reçoit les notifications
//   activer()      à appeler depuis un clic (iOS l'exige) : autorisation, abonnement, enregistrement sur le serveur
//   desactiver()   retire l'abonnement du navigateur et du serveur
//   erreur         message court en français, ou null
//   occupe         true pendant activer() / desactiver() (pour désactiver le bouton)
//
// Le service worker (public/sw.js) est enregistré dès l'ouverture de la page, avec la portée /admin.

const CLE_PUBLIQUE = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const SW_URL = "/sw.js";
const SW_PORTEE = "/admin";
const API = "/api/push/subscribe";

// Message prévu pour l'utilisateur (les autres erreurs sont traduites par messageErreur)
class MessageUtilisateur extends Error {}

function cleVersOctets(base64Url) {
  const base64 = (base64Url + "=".repeat((4 - (base64Url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const brut = window.atob(base64);
  return Uint8Array.from(brut, (c) => c.charCodeAt(0));
}

// Ce que le navigateur permet. Ne change pas pendant la session (installer l'appli ou changer de navigateur recharge la page).
const aucunChangement = () => () => {};
function lireEnvironnement() {
  const ua = navigator.userAgent;
  const iosOuIpad = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const installee = navigator.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
  // Avant l'installation, Safari ne propose pas PushManager : on le dit avant de conclure « non supporté »
  if (iosOuIpad && !installee) return "ios-installer";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "non-supporte";
  return "ok";
}
const environnementServeur = () => "inconnu";

function nomAppareil() {
  const ua = navigator.userAgent;
  const systeme = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "Mac" : "Appareil";
  const navigateur = /Edg\//.test(ua) ? "Edge" : /Firefox\/|FxiOS/.test(ua) ? "Firefox" : /OPR\//.test(ua) ? "Opera" : /Chrome\/|CriOS/.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return navigateur ? `${systeme} · ${navigateur}` : systeme;
}

const enregistrerSW = () => navigator.serviceWorker.register(SW_URL, { scope: SW_PORTEE, updateViaCache: "none" });

// pushManager.subscribe() exige un service worker actif : on attend la fin de son activation
function attendreActivation(registration, delaiMs = 10000) {
  if (registration.active) return Promise.resolve(registration);
  const sw = registration.installing ?? registration.waiting;
  if (!sw) return Promise.reject(new Error("sw-absent"));
  return new Promise((ok, ko) => {
    const minuteur = setTimeout(() => ko(new Error("sw-delai")), delaiMs);
    const verifier = () => {
      if (sw.state === "activated") {
        clearTimeout(minuteur);
        ok(registration);
      } else if (sw.state === "redundant") {
        clearTimeout(minuteur);
        ko(new Error("sw-echec"));
      }
    };
    sw.addEventListener("statechange", verifier);
    verifier();
  });
}

// L'abonnement a-t-il été fait avec notre clé VAPID ? (si le navigateur ne le dit pas, on suppose que oui)
function memeCle(abonnement, cle) {
  const actuelle = abonnement.options?.applicationServerKey;
  if (!actuelle) return true;
  const octets = new Uint8Array(actuelle);
  return octets.length === cle.length && octets.every((v, i) => v === cle[i]);
}

// Abonnement existant avec la bonne clé, sinon nouvel abonnement (l'ancien, fait avec une autre clé VAPID, est retiré)
async function abonner(registration, cle) {
  let abonnement = await registration.pushManager.getSubscription();
  if (abonnement && !memeCle(abonnement, cle)) {
    await abonnement.unsubscribe();
    abonnement = null;
  }
  if (abonnement) return abonnement;
  const options = { userVisibleOnly: true, applicationServerKey: cle };
  try {
    return await registration.pushManager.subscribe(options);
  } catch (e) {
    if (e?.name !== "InvalidStateError") throw e;
    // Un ancien abonnement (autre clé) bloque le nouveau : on le retire et on recommence une fois
    await (await registration.pushManager.getSubscription())?.unsubscribe();
    return registration.pushManager.subscribe(options);
  }
}

async function appelerServeur(methode, corps, getToken) {
  const jeton = await getToken();
  if (!jeton) throw new MessageUtilisateur("Connexion perdue. Reconnectez-vous, puis réessayez.");
  const reponse = await fetch(API, {
    method: methode,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${jeton}` },
    body: JSON.stringify(corps),
    cache: "no-store",
  });
  if (!reponse.ok) {
    const j = await reponse.json().catch(() => ({}));
    throw new MessageUtilisateur(typeof j?.erreur === "string" ? j.erreur : "Enregistrement impossible pour le moment.");
  }
}

function messageErreur(e) {
  if (e instanceof MessageUtilisateur) return e.message;
  if (e?.name === "AbortError") return "Le service de notifications du navigateur ne répond pas. Réessayez plus tard.";
  if (e?.name === "TypeError") return "Pas de connexion. Réessayez.";
  if (/^sw-/.test(e?.message ?? "")) return "Le service de notifications n'a pas démarré. Rechargez la page, puis réessayez.";
  return "Impossible d'activer les notifications pour le moment.";
}

export function usePush({ getToken, deviceLabel } = {}) {
  const env = useSyncExternalStore(aucunChangement, lireEnvironnement, environnementServeur);
  const [lu, setLu] = useState(null); // lecture du navigateur : "refuse" | "inactif" | "actif" (null tant qu'elle n'est pas finie)
  const [erreur, setErreur] = useState(null);
  const [occupe, setOccupe] = useState(false);

  // Toujours le dernier getToken, sans relancer les effets à chaque rendu
  const jetonRef = useRef(getToken);
  const libelleRef = useRef(deviceLabel);
  const occupeRef = useRef(false);
  useEffect(() => {
    jetonRef.current = getToken;
    libelleRef.current = deviceLabel;
  });

  // À l'ouverture : enregistre le service worker, puis lit l'état réel (autorisation + abonnement existant)
  useEffect(() => {
    if (env !== "ok") return;
    let annule = false;
    (async () => {
      let abonnement = null;
      let etatLu = "inactif";
      try {
        if (Notification.permission === "denied") {
          etatLu = "refuse";
        } else {
          const registration = await enregistrerSW();
          abonnement = await registration.pushManager.getSubscription();
          if (abonnement && Notification.permission === "granted" && CLE_PUBLIQUE && memeCle(abonnement, cleVersOctets(CLE_PUBLIQUE))) {
            etatLu = "actif";
          } else {
            abonnement = null;
          }
        }
      } catch {
        // l'erreur sera expliquée si la personne appuie sur « Activer »
      }
      if (annule) return;
      setLu(etatLu);
      // Remet l'appareil à jour sur le serveur (ligne perdue, ou appareil passé à un autre compte) : sans bruit
      if (abonnement && jetonRef.current) {
        const json = abonnement.toJSON();
        appelerServeur("POST", { endpoint: json.endpoint, keys: json.keys, deviceLabel: libelleRef.current ?? nomAppareil() }, jetonRef.current).catch(() => {});
      }
    })();
    return () => {
      annule = true;
    };
  }, [env]);

  const activer = useCallback(async () => {
    if (env !== "ok" || occupeRef.current) return;
    occupeRef.current = true;
    setOccupe(true);
    setErreur(null);
    let abonnement = null;
    try {
      if (!CLE_PUBLIQUE) throw new MessageUtilisateur("Les notifications ne sont pas configurées sur ce site.");
      // 1. L'autorisation d'abord, tout de suite dans le clic : iOS refuse de la demander après une attente
      let permission = Notification.permission;
      if (permission === "default") permission = await Notification.requestPermission();
      if (permission === "denied") {
        setLu("refuse");
        return;
      }
      if (permission !== "granted") throw new MessageUtilisateur("Les notifications n'ont pas été autorisées. Appuyez sur « Activer » et choisissez « Autoriser ».");

      // 2. Service worker actif, 3. abonnement avec notre clé VAPID
      const registration = await attendreActivation(await enregistrerSW());
      abonnement = await abonner(registration, cleVersOctets(CLE_PUBLIQUE));

      // 4. Enregistrement sur le serveur
      const json = abonnement.toJSON();
      await appelerServeur("POST", { endpoint: json.endpoint, keys: json.keys, deviceLabel: libelleRef.current ?? nomAppareil() }, jetonRef.current);
      setLu("actif");
    } catch (e) {
      // Pas d'appareil à moitié activé : si le serveur n'a pas pu l'enregistrer, on retire aussi l'abonnement du navigateur
      await abonnement?.unsubscribe().catch(() => {});
      setErreur(messageErreur(e));
    } finally {
      occupeRef.current = false;
      setOccupe(false);
    }
  }, [env]);

  const desactiver = useCallback(async () => {
    if (env !== "ok" || occupeRef.current) return;
    occupeRef.current = true;
    setOccupe(true);
    setErreur(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SW_PORTEE);
      const abonnement = await registration?.pushManager.getSubscription();
      if (abonnement) {
        const endpoint = abonnement.endpoint;
        await abonnement.unsubscribe();
        // Si le serveur ne répond pas, sa ligne devient inutile : il la supprimera de lui-même au prochain envoi (erreur 410)
        await appelerServeur("DELETE", { endpoint }, jetonRef.current).catch(() => {});
      }
      setLu("inactif");
    } catch (e) {
      setErreur(messageErreur(e));
    } finally {
      occupeRef.current = false;
      setOccupe(false);
    }
  }, [env]);

  const etat = env === "ok" ? (lu ?? "inconnu") : env;
  return { etat, activer, desactiver, erreur, occupe };
}
