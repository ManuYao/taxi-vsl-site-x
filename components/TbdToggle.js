"use client";

import { useEffect } from "react";

// Bouton TEMPORAIRE (démo) : montre ou cache les contours en pointillé des textes provisoires.
// Par défaut les contours sont CACHÉS (le visiteur voit le site propre) ; ce bouton, discret, sert à les montrer.
// Affiché seulement si site.config.js a `boutonTbd: true`. À retirer avant la mise en ligne.
// L'état vit dans l'attribut data-tbd de <html> ; le texte du bouton suit via CSS.
export default function TbdToggle() {
  useEffect(() => {
    try {
      if (localStorage.getItem("tbd-visible") === "1") document.documentElement.dataset.tbd = "on";
    } catch {}
  }, []);

  function basculer() {
    const racine = document.documentElement;
    const suivant = racine.dataset.tbd === "on" ? "off" : "on";
    racine.dataset.tbd = suivant;
    try {
      localStorage.setItem("tbd-visible", suivant === "on" ? "1" : "0");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={basculer}
      className="fixed bottom-24 left-3 z-40 min-h-9 rounded-full bg-ink/60 px-3 text-xs font-bold text-white opacity-40 transition-opacity hover:opacity-100 focus-visible:opacity-100 sm:bottom-4"
    >
      <span className="hidden [html[data-tbd=on]_&]:inline">Cacher les contours</span>
      <span className="[html[data-tbd=on]_&]:hidden">Montrer les contours</span>
    </button>
  );
}
