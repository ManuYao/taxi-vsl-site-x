"use client";

import { useState } from "react";
import { pad2, sameDay } from "@/lib/dates";

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-6 text-pri",
};

// Plages à confirmer avec le client (voir CLAUDE.md)
const PERIODES = [
  {
    nom: "Matin",
    de: 5,
    a: 11,
    icone: (
      <svg {...svg}>
        <path d="M17 18a5 5 0 0 0-10 0M12 3v6M4.2 10.2l1.4 1.4M1 18h2M21 18h2M18.4 11.6l1.4-1.4M23 22H1M9 6l3-3 3 3" />
      </svg>
    ),
  },
  {
    nom: "Après-midi",
    de: 12,
    a: 17,
    icone: (
      <svg {...svg}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    nom: "Soir",
    de: 18,
    a: 23,
    icone: (
      <svg {...svg}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    ),
  },
];
const MINUTES = [0, 15, 30, 45];
const periodeDe = (h) => (h < 12 ? 0 : h < 18 ? 1 : 2);

const caseBase = "rounded-xl bg-white font-bold tabular-nums shadow-[inset_0_0_0_1.5px_#e2e6e3] disabled:opacity-35";
const caseOn = "!bg-pri !text-white !shadow-none";

// Heure : un bouton avec une petite horloge, puis un panneau « une étape à la fois »
// (moment de la journée → heure → minutes). Il se ferme après les minutes.
// permettrePasse : n'interdit pas les heures déjà passées aujourd'hui (le chauffeur peut noter une course qu'il vient de faire)
export default function TimePicker({ today, maintenant, date, hour, minute, onChange, permettrePasse = false }) {
  const [ouvert, setOuvert] = useState(false);
  const [periode, setPeriode] = useState(periodeDe(hour));
  const [minutesVisibles, setMinutesVisibles] = useState(false);

  const aujourdhui = !permettrePasse && sameDay(date, today);
  const p = PERIODES[periode];

  function basculer() {
    if (!ouvert) {
      setPeriode(periodeDe(hour));
      setMinutesVisibles(false);
    }
    setOuvert(!ouvert);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className="text-base font-bold">Heure de prise en charge</span>

      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="panneau-heure"
        onClick={basculer}
        className={`flex min-h-[76px] w-full items-center gap-4 rounded-[18px] py-2.5 pr-[18px] pl-3 text-left hover:bg-soft ${
          ouvert ? "bg-soft shadow-[inset_0_0_0_2px_var(--pri)]" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"
        }`}
      >
        <svg viewBox="0 0 60 60" aria-hidden="true" className="size-14 flex-none">
          <circle cx="30" cy="30" r="27" fill="#fff" stroke="var(--pri)" strokeWidth="3" />
          <g stroke="var(--soft2)" strokeWidth="3" strokeLinecap="round">
            <path d="M30 7v4M53 30h-4M30 53v-4M7 30h4" />
          </g>
          <line
            x1="30" y1="30" x2="30" y2="17" stroke="var(--dark)" strokeWidth="4" strokeLinecap="round"
            style={{ transformOrigin: "30px 30px", transformBox: "view-box", transform: `rotate(${(hour % 12) * 30 + minute * 0.5}deg)`, transition: "transform .45s cubic-bezier(.3,1.4,.5,1)" }}
          />
          <line
            x1="30" y1="30" x2="30" y2="10" stroke="var(--pri)" strokeWidth="3" strokeLinecap="round"
            style={{ transformOrigin: "30px 30px", transformBox: "view-box", transform: `rotate(${minute * 6}deg)`, transition: "transform .45s cubic-bezier(.3,1.4,.5,1)" }}
          />
          <circle cx="30" cy="30" r="3.5" fill="var(--dark)" />
        </svg>
        <span className="flex-1 font-title text-3xl font-extrabold tabular-nums">
          {pad2(hour)} h {pad2(minute)}
        </span>
        <span className="text-[15px] font-bold text-pri">{ouvert ? "Fermer" : "Changer"}</span>
      </button>

      {ouvert && (
        <div id="panneau-heure" className="flex flex-col gap-3 rounded-[18px] bg-bg p-4">
          <div role="group" aria-label="Moment de la journée" className="grid grid-cols-3 gap-2">
            {PERIODES.map((x, i) => (
              <button
                key={x.nom}
                type="button"
                disabled={aujourdhui && x.a <= maintenant}
                aria-pressed={i === periode}
                onClick={() => {
                  setPeriode(i);
                  setMinutesVisibles(false);
                }}
                className={`flex min-h-[76px] flex-col items-center justify-center gap-0.5 whitespace-nowrap px-0.5 py-1.5 text-[15px] leading-tight ${caseBase} rounded-2xl ${i === periode ? caseOn : ""}`}
              >
                <span className={i === periode ? "[&_svg]:text-white" : ""}>{x.icone}</span>
                {x.nom}
                <small className={`text-[13px] font-normal ${i === periode ? "text-white" : "text-[#5a6366]"}`}>
                  {x.de} h – {x.a} h
                </small>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: p.a - p.de + 1 }, (_, i) => p.de + i).map((h) => (
              <button
                key={h}
                type="button"
                disabled={aujourdhui && h <= maintenant}
                aria-pressed={h === hour}
                onClick={() => {
                  onChange(h, minute);
                  setMinutesVisibles(true);
                }}
                className={`min-h-14 px-0.5 text-[19px] ${caseBase} ${h === hour ? caseOn : ""}`}
              >
                {h} h
              </button>
            ))}
          </div>

          {minutesVisibles && (
            <div className="flex flex-col gap-2">
              <span className="text-[15px] font-bold text-[#5a6366]">Et les minutes ?</span>
              <div className="grid grid-cols-4 gap-2">
                {MINUTES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-label={`${m} minutes`}
                    aria-pressed={m === minute}
                    onClick={() => {
                      onChange(hour, m);
                      setOuvert(false);
                    }}
                    className={`min-h-[58px] text-xl ${caseBase} ${m === minute ? caseOn : ""}`}
                  >
                    :{pad2(m)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
