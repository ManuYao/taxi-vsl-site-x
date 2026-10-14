"use client";

import { useEffect, useRef } from "react";

// Fenêtre de confirmation par-dessus la page (fond sombre et flou) pour les actions qui comptent.
// <dialog> natif : le reste de la page devient inactif, Échap ferme, le focus reste dans la fenêtre.
export default function Confirmation({ ouvert, titre, message, libelle, danger = false, enCours = false, onConfirmer, onAnnuler }) {
  const ref = useRef(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) d.showModal();
    if (!ouvert && d.open) d.close();
  }, [ouvert]);

  function annuler(e) {
    e?.preventDefault();
    if (!enCours) onAnnuler();
  }

  return (
    <dialog
      ref={ref}
      onCancel={annuler}
      onClick={(e) => e.target === ref.current && annuler()}
      aria-labelledby="confirmation-titre"
      className="m-auto w-[calc(100%-32px)] max-w-[420px] rounded-3xl bg-white p-0 text-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,.6)] backdrop:bg-[#0F241C]/60 backdrop:backdrop-blur-[6px] motion-safe:open:animate-[apparition_.18s_ease-out]"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id="confirmation-titre" className="font-title text-[22px] font-extrabold leading-tight">{titre}</h2>
        {message && <div className="text-[17px] leading-snug text-[#4a5457]">{message}</div>}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            autoFocus={!danger}
            disabled={enCours}
            onClick={onConfirmer}
            className={`min-h-[56px] rounded-full px-6 text-[18px] font-bold text-white disabled:opacity-70 ${danger ? "bg-[#b3261e] hover:bg-[#8f1e18]" : "bg-pri hover:bg-pri-hover"}`}
          >
            {enCours ? <Points /> : libelle}
          </button>
          <button
            type="button"
            autoFocus={danger}
            disabled={enCours}
            onClick={annuler}
            className="min-h-[52px] rounded-full bg-bg px-6 text-[17px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3] disabled:opacity-60"
          >
            Annuler
          </button>
        </div>
      </div>
    </dialog>
  );
}

// « … » animé pour les actions en cours
export function Points({ label = "En cours" }) {
  return (
    <span role="status" className="inline-flex items-center gap-1" aria-label={label}>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="size-2 rounded-full bg-current motion-safe:animate-[point_1s_ease-in-out_infinite]" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
