"use client";

import { useState } from "react";
import { MODES } from "@/lib/caisse";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-xl font-bold tabular-nums focus:outline-none shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";

const AIDES = {
  especes: "Argent liquide",
  carte: "Terminal de paiement",
  tiers_payant: "Assurance Maladie : à recevoir plus tard",
  virement: "Virement bancaire",
};

// Encaisser une course : montant prérempli avec l'estimation (à corriger selon le taximètre), mode de paiement, Valider.
// onEncaisser(courseId, mode, montant) renvoie une promesse ; elle affiche elle-même le résultat.
export default function Encaisser({ course, onEncaisser }) {
  const estimation = course.est_price_cents != null ? String(course.est_price_cents / 100).replace(".", ",") : "";
  const [ouvert, setOuvert] = useState(false);
  const [montant, setMontant] = useState(estimation);
  const [mode, setMode] = useState(course.conventionne ? "tiers_payant" : "carte");
  const [enCours, setEnCours] = useState(false);

  async function valider(e) {
    e.preventDefault();
    setEnCours(true);
    await onEncaisser(course.id, mode, montant);
    setEnCours(false);
  }

  if (!ouvert) {
    return (
      <button type="button" onClick={() => setOuvert(true)} className="min-h-[52px] rounded-xl bg-pri px-4 font-bold text-white hover:bg-pri-hover">
        Encaisser
      </button>
    );
  }
  return (
    <form onSubmit={valider} className="flex flex-col gap-3 rounded-[14px] bg-bg p-3" noValidate>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`montant-${course.id}`} className="text-base font-bold">Montant encaissé (€)</label>
        <input id={`montant-${course.id}`} inputMode="decimal" autoComplete="off" value={montant} onChange={(e) => setMontant(e.target.value)} className={champ} />
        <span className="text-[13px] text-[#5a6366]">{estimation ? `Estimation : ${estimation} €. Corrigez selon le taximètre.` : "Écrivez le montant du taximètre."}</span>
      </div>
      <div role="radiogroup" aria-label="Mode de paiement" className="grid gap-2">
        {Object.entries(MODES).map(([id, libelle]) => (
          <label key={id} className={`flex min-h-[52px] cursor-pointer items-center gap-3 rounded-[14px] px-3.5 py-2 ${mode === id ? "bg-soft shadow-[inset_0_0_0_2px_var(--pri)]" : "bg-white shadow-[inset_0_0_0_1.5px_#e2e6e3]"}`}>
            <input type="radio" name={`mode-${course.id}`} value={id} checked={mode === id} onChange={() => setMode(id)} className="size-5 accent-pri" />
            <span className="flex flex-col leading-snug">
              <b>{libelle}</b>
              <span className="text-[13px] text-[#5a6366]">{AIDES[id]}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-[1.4fr_1fr] gap-2">
        <button type="submit" disabled={enCours} className="min-h-[52px] rounded-xl bg-pri font-bold text-white disabled:opacity-60">{enCours ? "Enregistrement…" : "Valider"}</button>
        <button type="button" disabled={enCours} onClick={() => setOuvert(false)} className="min-h-[52px] rounded-xl bg-white font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]">Annuler</button>
      </div>
    </form>
  );
}
