"use client";

import { useEffect, useEffectEvent, useRef } from "react";

// Anti-spam Cloudflare Turnstile. Le widget reste invisible : il ne s'affiche que si Cloudflare
// a un doute sur le visiteur (mode « interaction-only »), pour ne pas gêner les vrais clients.
// Le jeton obtenu est envoyé avec la demande ; le serveur le vérifie avec la clé secrète.
export const CLE_PUBLIQUE_TURNSTILE = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

let chargement = null;
function chargerScript() {
  if (window.turnstile) return Promise.resolve();
  chargement ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      chargement = null; // un bloqueur de publicités l'a peut-être bloqué : on pourra réessayer
      script.remove();
      reject(new Error("Turnstile n'a pas pu être chargé"));
    };
    document.head.appendChild(script);
  });
  return chargement;
}

// onJeton(jeton | null) : le jeton prêt, ou null s'il a expiré. onProbleme() : impossible de vérifier.
// Pour obtenir un nouveau jeton (ils ne servent qu'une fois), recréer le composant avec une autre `key`.
export default function Turnstile({ onJeton, onProbleme }) {
  const conteneur = useRef(null);
  const donnerJeton = useEffectEvent(onJeton);
  const signalerProbleme = useEffectEvent(onProbleme);

  useEffect(() => {
    let annule = false;
    let idWidget = null;
    chargerScript()
      .then(() => {
        if (annule || !conteneur.current || !window.turnstile) return;
        idWidget = window.turnstile.render(conteneur.current, {
          sitekey: CLE_PUBLIQUE_TURNSTILE,
          appearance: "interaction-only",
          language: "fr",
          callback: (jeton) => donnerJeton(jeton),
          "expired-callback": () => donnerJeton(null),
          "timeout-callback": () => donnerJeton(null),
          "error-callback": () => {
            donnerJeton(null);
            signalerProbleme();
            return true;
          },
        });
      })
      .catch(() => {
        if (!annule) signalerProbleme();
      });
    return () => {
      annule = true;
      if (idWidget !== null) window.turnstile?.remove(idWidget);
    };
  }, []);

  return <div ref={conteneur} />;
}
