"use client";

import { useEffect, useState } from "react";

// Demande le prix estimé au serveur (/api/estimate) dès que le départ et l'arrivée sont connus
// avec leurs coordonnées. Le calcul reste côté serveur : le navigateur n'a ni tarifs ni clés.
// statut : "vide" (pas assez d'infos) | "calcul" | "ok" | "erreur"
export default function useEstimation({ depart, arrivee, arret, date, heure }) {
  const pret = Boolean(depart && arrivee);
  // La clé résume la demande : si elle change, l'ancien résultat n'est plus valable.
  const cle = pret
    ? JSON.stringify([depart.lat, depart.lon, arrivee.lat, arrivee.lon, arret?.lat ?? null, arret?.lon ?? null, date, heure])
    : null;
  const [recu, setRecu] = useState({ cle: null, resultat: null });

  useEffect(() => {
    if (!cle) return;
    const [dLat, dLon, aLat, aLon, sLat, sLon, jour, h] = JSON.parse(cle);
    const ctrl = new AbortController();
    const minuteur = setTimeout(async () => {
      try {
        const r = await fetch("/api/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            depart: { lat: dLat, lon: dLon },
            arrivee: { lat: aLat, lon: aLon },
            ...(sLat !== null ? { arret: { lat: sLat, lon: sLon } } : {}),
            date: jour,
            heure: h,
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
