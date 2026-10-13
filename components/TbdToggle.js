"use client";

import { useEffect } from "react";

// Bouton TEMPORAIRE (démo) : cache ou montre les contours en pointillé des textes provisoires.
// Affiché seulement si site.config.js a `boutonTbd: true`. À retirer avant la mise en ligne.
// L'état vit dans l'attribut data-tbd de <html> ; le texte du bouton suit via CSS.
export default function TbdToggle() {
  useEffect(() => {
    try {
      if (localStorage.getItem("tbd-visible") === "0") {
        document.documentElement.dataset.tbd = "off";
      }
    } catch {}
  }, []);

  function basculer() {
    const racine = document.documentElement;
    const suivant = racine.dataset.tbd === "off" ? "on" : "off";
    racine.dataset.tbd = suivant;
    try {
      localStorage.setItem("tbd-visible", suivant === "on" ? "1" : "0");
    } catch {}
  }

  return (
    <button
      type="button"
      onClick={basculer}
      className="fixed bottom-24 left-3 z-40 min-h-[44px] rounded-full bg-ink px-4 text-sm font-bold text-white shadow-lg sm:bottom-4"
    >
      <span className="[html[data-tbd=off]_&]:hidden">Cacher les contours provisoires</span>
      <span className="hidden [html[data-tbd=off]_&]:inline">Montrer les contours provisoires</span>
    </button>
  );
}
