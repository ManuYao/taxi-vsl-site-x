"use client";

import { useEffect } from "react";

// Apparition de quelques éléments au défilement : ils portent data-rv="haut | gauche | droite | zoom"
// (et --rv-delay pour décaler). Sans JavaScript, ou avec « réduire les animations », tout reste visible.
// Seuls les éléments encore hors de l'écran sont cachés, puis révélés quand on arrive dessus.
export default function Apparitions() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const { target, isIntersecting } of entrees) {
          if (!isIntersecting) continue;
          observateur.unobserve(target);
          target.classList.replace("rv-pret", "rv-vu");
          // Une fois révélé, on retire la classe : les effets de survol reprennent la main.
          setTimeout(() => target.classList.remove("rv-vu"), 2500);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    for (const el of document.querySelectorAll("[data-rv]")) {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) continue; // déjà visible : on ne touche pas
      el.classList.add("rv-pret");
      observateur.observe(el);
    }
    return () => observateur.disconnect();
  }, []);

  return null;
}
