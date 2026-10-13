"use client";

import { heureParis, jourParis, libelleJour } from "@/lib/paris";
import { Details, Puce, Trajet, lienTel } from "./CarteCourse";
import { IconeTelephone } from "./icones";

const STATUT = { refused: "Refusée", cancelled: "Annulée", done: "Terminée", accepted: "Acceptée", pending: "À traiter" };

function Ligne({ course, maintenant, calme = false }) {
  const quand = new Date(course.pickup_at);
  return (
    <article className={`grid grid-cols-[auto_1fr] gap-3 rounded-[14px] border-l-4 bg-white p-3.5 ${calme ? "border-[#c9d1cc]" : "border-pri"}`}>
      <p className="pt-0.5 font-title text-lg font-extrabold leading-tight whitespace-nowrap tabular-nums">{heureParis(quand)}</p>
      <div className="flex min-w-0 flex-col gap-1.5">
        <Trajet course={course} />
        <Details course={course} />
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 text-[15px] [overflow-wrap:anywhere]">
            <b>{course.customer_name}</b> <span className="tabular-nums text-[#5a6366]">{course.customer_phone}</span>
          </p>
          {!calme && (
            <a href={lienTel(course.customer_phone)} aria-label={`Appeler ${course.customer_name}`} className="flex size-11 flex-none items-center justify-center rounded-full bg-soft text-pri">
              <IconeTelephone className="size-5" />
            </a>
          )}
        </div>
        {calme && <p className="text-[13px] font-bold text-[#5a6366]">{STATUT[course.status]} · {libelleJour(quand, maintenant)}</p>}
      </div>
    </article>
  );
}

// Courses acceptées à venir, groupées par jour, puis l'historique (passées, refusées, annulées).
export default function Planning({ planning, historique, maintenant }) {
  const aVenir = planning.filter((c) => new Date(c.pickup_at) >= new Date(maintenant.getTime() - 2 * 3600_000));
  const passees = planning.filter((c) => !aVenir.includes(c));
  const jours = [];
  for (const c of aVenir) {
    const cle = jourParis(new Date(c.pickup_at));
    const dernier = jours[jours.length - 1];
    if (dernier?.cle === cle) dernier.courses.push(c);
    else jours.push({ cle, courses: [c] });
  }
  const anciennes = [...passees, ...historique];

  return (
    <div className="flex flex-col gap-3">
      {jours.length === 0 && (
        <p className="rounded-[18px] bg-white p-6 text-center text-[#5a6366]">Aucune course acceptée à venir.</p>
      )}
      {jours.map(({ cle, courses }) => (
        <section key={cle} className="flex flex-col gap-2">
          <h2 className="mt-2 px-0.5 text-[13px] font-bold uppercase tracking-[.06em] text-[#5a6366]">
            {libelleJour(new Date(courses[0].pickup_at), maintenant)} <Puce>{courses.length}</Puce>
          </h2>
          {courses.map((c) => <Ligne key={c.id} course={c} maintenant={maintenant} />)}
        </section>
      ))}

      {anciennes.length > 0 && (
        <details className="mt-3 rounded-[18px] bg-white/60 p-3">
          <summary className="min-h-11 cursor-pointer py-2 text-[15px] font-bold">Courses passées et refusées ({anciennes.length})</summary>
          <div className="mt-2 flex flex-col gap-2">
            {anciennes.map((c) => <Ligne key={c.id} course={c} maintenant={maintenant} calme />)}
          </div>
        </details>
      )}
    </div>
  );
}
