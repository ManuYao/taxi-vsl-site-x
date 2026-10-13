"use client";

import { useEffect, useState } from "react";

// Demande le prix estimé au serveur (/api/estimate) dès que le départ et l'arrivée sont connus
// avec leurs coordonnées. Le calcul reste côté serveur : le navigateur n'a ni tarifs, ni promotions, ni clés.
// Les textes des adresses et le code promo partent aussi : le serveur en déduit la remise éventuelle.
// statut : "vide" (pas assez d'infos) | "calcul" | "ok" | "erreur"
export default function useEstimation({ depart, arrivee, arret, date, heure, code }) {
  const pret = Boolean(depart && arrivee);
  // La clé résume la demande : si elle change, l'ancien résultat n'est plus valable.
  const cle = pret
    ? JSON.stringify([depart.lat, depart.lon, depart.label ?? "", arrivee.lat, arrivee.lon, arrivee.label ?? "", arret?.lat ?? null, arret?.lon ?? null, date, heure, (code ?? "").trim()])
    : null;
  const [recu, setRecu] = useState({ cle: null, resultat: null });

  useEffect(() => {
    if (!cle) return;
    const [dLat, dLon, dLabel, aLat, aLon, aLabel, sLat, sLon, jour, h, codePromo] = JSON.parse(cle);
    const ctrl = new AbortController();
    const minuteur = setTimeout(async () => {
      try {
        const r = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            depart: { lat: dLat, lon: dLon, ...(dLabel ? { label: dLabel.slice(0, 200) } : {}) },
            arrivee: { lat: aLat, lon: aLon, ...(aLabel ? { label: aLabel.slice(0, 200) } : {}) },
            ...(sLat !== null ? { arret: { lat: sLat, lon: sLon } } : {}),
            date: jour,
            heure: h,
            ...(codePromo ? { code: codePromo.slice(0, 30) } : {}),
          }),
          signal: ctrl.signal,
        });
        if (!r.ok) throw new Error("estimation refusée");
        setRecu({ cle, resultat: await r.json() });
      } catch (e) {
        if (e.name !== "AbortError") setRecu({ cle, resultat: null });
      }
    }, 350); // petit délai : on n'interroge pas le serveur à chaque touche
    return () => {
      clearTimeout(minuteur);
      ctrl.abort();
    };
  }, [cle]);

  if (!cle) return { statut: "vide", resultat: null };
  if (recu.cle !== cle) return { statut: "calcul", resultat: null };
  return recu.resultat ? { statut: "ok", resultat: recu.resultat } : { statut: "erreur", resultat: null };
}
