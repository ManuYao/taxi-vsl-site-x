"use client";

import { useState } from "react";
import { addDays, cap, jourLong, noon, relatif, sameDay, ymd } from "@/lib/dates";

const chip =
  "flex min-h-[72px] flex-col items-center justify-center gap-0.5 rounded-2xl p-2 leading-tight shadow-[inset_0_0_0_1.5px_var(--line)] transition-colors";
const chipOff = "bg-bg hover:bg-soft [--line:#e2e6e3]";
const chipOn = "bg-pri text-white shadow-none";

// Date : 2 raccourcis (Aujourd'hui, Demain) + « Autre date » qui ouvre un calendrier.
export default function DatePicker({ today, value, onChange }) {
  const [calOuvert, setCalOuvert] = useState(false);
  const [mois, setMois] = useState(new Date(value.getFullYear(), value.getMonth(), 1, 12));

  const raccourcis = [0, 1].map((n) => addDays(today, n));
  const dansRaccourcis = raccourcis.some((d) => sameDay(d, value));
  const rel = relatif(value, today);

  function choisir(d, fermer = true) {
    onChange(noon(d));
    if (fermer) setCalOuvert(false);
  }

  const premierMois = mois.getFullYear() === today.getFullYear() && mois.getMonth() === today.getMonth();
  const decalage = (mois.getDay() + 6) % 7; // lundi en premier
  const nbJours = new Date(mois.getFullYear(), mois.getMonth() + 1, 0).getDate();

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span id="date-label" className="text-base font-bold">Date</span>
        <span className="text-base font-bold text-pri" aria-live="polite">
          {rel ? `${rel}, ` : ""}
          {jourLong(value)}
        </span>
      </div>

      <div role="group" aria-labelledby="date-label" className="grid grid-cols-3 gap-2 max-[420px]:gap-1.5">
        {raccourcis.map((d) => {
          const on = sameDay(d, value);
          return (
            <button key={ymd(d)} type="button" aria-pressed={on} onClick={() => choisir(d)} className={`${chip} ${on ? chipOn : chipOff}`}>
              <b className="text-[17px] max-[420px]:text-sm">{relatif(d, today)}</b>
              <small className={`text-sm max-[420px]:text-[13px] ${on ? "text-white/80" : "text-[#5a6366]"}`}>
                {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </small>
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={calOuvert}
          aria-controls="calendrier"
          aria-pressed={!dansRaccourcis}
          onClick={() => {
            if (!calOuvert) setMois(new Date(value.getFullYear(), value.getMonth(), 1, 12));
            setCalOuvert(!calOuvert);
          }}
          className={`${chip} ${!dansRaccourcis ? chipOn : chipOff}`}
        >
          <b className="text-[17px] max-[420px]:text-sm">Autre date</b>
          <small className={`text-sm max-[420px]:text-[13px] ${!dansRaccourcis ? "text-white/80" : "text-[#5a6366]"}`}>
            {dansRaccourcis ? "Calendrier" : value.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
          </small>
        </button>
      </div>

      {calOuvert && (
        <div id="calendrier" className="rounded-[18px] bg-bg p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              disabled={premierMois}
              aria-label="Mois précédent"
              onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() - 1, 1, 12))}
              className="size-[46px] rounded-full bg-white text-[26px] leading-none text-pri disabled:opacity-30"
            >
              ‹
            </button>
            <b className="font-title text-lg">{cap(mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }))}</b>
            <button
              type="button"
              aria-label="Mois suivant"
              onClick={() => setMois(new Date(mois.getFullYear(), mois.getMonth() + 1, 1, 12))}
              className="size-[46px] rounded-full bg-white text-[26px] leading-none text-pri"
            >
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["L", "M", "M", "J", "V", "S", "D"].map((j, i) => (
              <span key={i} aria-hidden="true" className="py-1 text-center text-[13px] font-bold text-[#5a6366]">
                {j}
              </span>
            ))}
            {Array.from({ length: decalage }, (_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: nbJours }, (_, i) => {
              const d = new Date(mois.getFullYear(), mois.getMonth(), i + 1, 12);
              const passe = d < today;
              const on = sameDay(d, value);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={passe}
                  aria-pressed={on}
                  aria-label={jourLong(d)}
                  onClick={() => choisir(d)}
                  className={`h-12 rounded-xl text-[17px] tabular-nums ${
                    on
                      ? "bg-pri font-bold text-white"
                      : passe
                        ? "font-normal text-[#b8bfbc]"
                        : `font-bold hover:bg-soft ${sameDay(d, today) ? "shadow-[inset_0_0_0_2px_var(--soft2)]" : ""}`
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
