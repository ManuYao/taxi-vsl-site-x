"use client";

import { useSyncExternalStore } from "react";

// Faux sur le serveur et pendant la construction du site, vrai dans le navigateur.
// Sert aux écrans qui dépendent de l'heure ou de la session : on ne les affiche qu'une fois dans le navigateur
// (sinon la page pré-calculée afficherait la date du jour de la construction).
const jamais = () => () => {};

export default function useDansLeNavigateur() {
  return useSyncExternalStore(jamais, () => true, () => false);
}
