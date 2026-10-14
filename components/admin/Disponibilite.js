"use client";

import { useState } from "react";
import { etatEffectif } from "@/lib/disponibilite";
import Depliable from "./Depliable";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";

const ETATS = [
  { id: "online", titre: "En ligne", aide: "Les clients peuvent réserver sur le site." },
  { id: "offline", titre: "Hors ligne", aide: "Le formulaire est fermé. Le téléphone reste visible." },
  { id: "vacances", titre: "Vacances", aide: "Fermé entre deux dates, puis rouvert tout seul." },
];

// Disponibilité : en ligne, hors ligne ou vacances (avec dates et message affiché sur le site).
// `dispo` : la ligne de la base ; `onEnregistrer(valeurs)` renvoie une promesse et affiche elle-même le résultat.
export default function Disponibilite({ dispo, onEnregistrer }) {
  const effectif = etatEffectif(dispo);
  const [choix, setChoix] = useState(dispo?.state ?? "online");
  const [debut, setDebut] = useState(dispo?.date_from ?? "");
  const [fin, setFin] = useState(dispo?.date_to ?? "");
  const [message, setMessage] = useState(dispo?.message ?? "");
  const [enCours, setEnCours] = useState(false);

  async function enregistrer(e) {
    e.preventDefault();
    setEnCours(true);
    await onEnregistrer({ state: choix, date_from: debut || null, date_to: fin || null, message });
    setEnCours(false);
  }

  const resume =
    effectif.etat === "online"
      ? "Les réservations en ligne sont ouvertes."
      : effectif.etat === "offline"
        ? "Les réservations en ligne sont fermées."
        : `En vacances${effectif.jusquau ? ` jusqu'au ${effectif.jusquau.split("-").reverse().join("/")} inclus` : ""}.`;

  return (
    <Depliable titre="Disponibilité" sousTitre={`${effectif.ouvert ? "🟢" : "🔴"} ${resume}`} ouvertParDefaut>

      <form onSubmit={enregistrer} className="flex flex-col gap-3">
        <div role="radiogroup" aria-label="État du service" className="grid gap-2">
          {ETATS.map((e) => (
            <label
              key={e.id}
              className={`flex min-h-[58px] cursor-pointer items-center gap-3 rounded-[14px] px-4 py-2.5 ${
                choix === e.id ? "bg-soft shadow-[inset_0_0_0_2px_var(--pri)]" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"
              }`}
            >
              <input type="radio" name="etat-service" value={e.id} checked={choix === e.id} onChange={() => setChoix(e.id)} className="size-5 accent-pri" />
              <span className="flex flex-col leading-snug">
                <b>{e.titre}</b>
                <span className="text-[14px] text-[#5a6366]">{e.aide}</span>
              </span>
            </label>
          ))}
        </div>

        {choix === "vacances" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vac-debut" className="text-base font-bold">Du</label>
              <input id="vac-debut" type="date" value={debut} onChange={(e) => setDebut(e.target.value)} className={champ} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="vac-fin" className="text-base font-bold">Jusqu&apos;au (inclus)</label>
              <input id="vac-fin" type="date" value={fin} min={debut || undefined} onChange={(e) => setFin(e.target.value)} className={champ} />
            </div>
            <p className="col-span-2 text-[14px] text-[#5a6366]">Sans date de début, la fermeture commence tout de suite. Sans date de fin, elle dure jusqu&apos;à ce que vous repassiez « En ligne ».</p>
          </div>
        )}

        {choix !== "online" && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="dispo-message" className="text-base font-bold">Message affiché sur le site <span className="font-normal text-[#5a6366]">(facultatif)</span></label>
            <textarea id="dispo-message" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={300} rows={3} className={`${champ} resize-none`} placeholder="Ex. De retour le 28. Pour une urgence, appelez-nous." />
          </div>
        )}

        <button type="submit" disabled={enCours} className="min-h-[52px] rounded-xl bg-pri font-bold text-white hover:bg-pri-hover disabled:opacity-60">
          {enCours ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </Depliable>
  );
}
