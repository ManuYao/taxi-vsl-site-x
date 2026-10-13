"use client";

import { useState } from "react";
import { heureParis, libelleJour } from "@/lib/paris";
import { IconeTelephone } from "./icones";

// « il y a 3 min » à partir de l'heure de création
export function ilYA(creeLe, maintenant) {
  const min = Math.max(0, Math.round((maintenant - new Date(creeLe)) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
}

export const lienTel = (tel) => `tel:${String(tel).replace(/[^\d+]/g, "")}`;

export function Puce({ children, fort = false }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${fort ? "bg-pri text-white" : "bg-soft text-pri"}`}>{children}</span>
  );
}

export function Trajet({ course }) {
  return (
    <p className="font-title text-[17px] font-bold leading-snug [overflow-wrap:anywhere]">
      {course.from_label}
      {course.stop_label && <span className="block text-[15px] font-normal text-[#5a6366]">via {course.stop_label}</span>}
      <span className="block text-pri">→ {course.to_label}</span>
    </p>
  );
}

export function Details({ course }) {
  const prix = course.est_price_cents != null ? `≈ ${Math.round(course.est_price_cents / 100)} €` : "Prix à confirmer";
  return (
    <p className="flex flex-wrap gap-x-3 gap-y-1 text-[15px] tabular-nums text-[#5a6366]">
      <span>{course.passengers} passager{course.passengers > 1 ? "s" : ""}</span>
      <span className="font-bold text-ink">{prix}</span>
      {course.est_km != null && <span>{Math.round(course.est_km)} km</span>}
    </p>
  );
}

// Une demande à traiter : trajet, quand, qui, et les deux boutons Accepter / Refuser.
export default function CarteCourse({ course, maintenant, onAction }) {
  const [confirmerRefus, setConfirmerRefus] = useState(false);
  const [enCours, setEnCours] = useState(null); // "accepter" | "refuser"
  const quand = new Date(course.pickup_at);

  async function agir(action) {
    setEnCours(action);
    await onAction(course.id, action);
    setEnCours(null);
    setConfirmerRefus(false);
  }

  return (
    <article className="flex flex-col gap-2.5 rounded-[18px] bg-white p-4 shadow-[0_8px_20px_-16px_rgba(15,25,20,.6)]">
      <div className="flex flex-wrap items-center gap-1.5">
        <Puce fort>{libelleJour(quand, maintenant)}, {heureParis(quand)}</Puce>
        {course.conventionne && <Puce>Conventionné</Puce>}
        {course.luggage && <Puce>Bagages</Puce>}
        <span className="ml-auto text-xs text-[#5a6366]">{ilYA(course.created_at, maintenant)}</span>
      </div>

      <Trajet course={course} />
      <Details course={course} />
      {course.travel_ref && <p className="text-[15px] text-[#5a6366]">Vol / train : <b className="text-ink">{course.travel_ref}</b></p>}

      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 text-[15px] [overflow-wrap:anywhere]">
          <b>{course.customer_name}</b>
          <span className="block tabular-nums text-[#5a6366]">{course.customer_phone}</span>
        </p>
        <a
          href={lienTel(course.customer_phone)}
          aria-label={`Appeler ${course.customer_name}`}
          className="flex size-12 flex-none items-center justify-center rounded-full bg-soft text-pri"
        >
          <IconeTelephone className="size-5" />
        </a>
      </div>

      {confirmerRefus ? (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={enCours !== null} onClick={() => agir("refuser")} className="min-h-[52px] rounded-xl bg-[#b3261e] font-bold text-white disabled:opacity-60">
            {enCours === "refuser" ? "…" : "Oui, refuser"}
          </button>
          <button type="button" disabled={enCours !== null} onClick={() => setConfirmerRefus(false)} className="min-h-[52px] rounded-xl bg-bg font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]">
            Non, garder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[1.3fr_1fr] gap-2">
          <button type="button" disabled={enCours !== null} onClick={() => agir("accepter")} className="min-h-[52px] rounded-xl bg-pri font-bold text-white hover:bg-pri-hover disabled:opacity-60">
            {enCours === "accepter" ? "…" : "Accepter"}
          </button>
          <button type="button" disabled={enCours !== null} onClick={() => setConfirmerRefus(true)} className="min-h-[52px] rounded-xl bg-bg font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3] disabled:opacity-60">
            Refuser
          </button>
        </div>
      )}
    </article>
  );
}
