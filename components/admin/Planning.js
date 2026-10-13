"use client";

import { useState } from "react";
import { heureParis, jourParis, libelleJour } from "@/lib/paris";
import { Details, Puce, Trajet, lienTel } from "./CarteCourse";
import AjouterCourse from "./AjouterCourse";
import Encaisser from "./Encaisser";
import { IconeTelephone } from "./icones";

const STATUT = { refused: "Refusée", cancelled: "Annulée", done: "Terminée", accepted: "Acceptée", pending: "À traiter" };

// Bouton d'annulation en deux appuis : « Annuler la course » puis « Oui, annuler » (pour éviter les faux appuis)
function Annulation({ course, onAction }) {
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function annuler() {
    setEnCours(true);
    await onAction(course.id, "annuler");
    setEnCours(false);
    setConfirmer(false);
  }

  if (!confirmer) {
    return (
      <button type="button" onClick={() => setConfirmer(true)} className="min-h-11 self-start rounded-full bg-bg px-4 text-[14px] font-bold text-[#b3261e] shadow-[inset_0_0_0_1.5px_#e2e6e3]">
        Annuler la course
      </button>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={enCours} onClick={annuler} className="min-h-11 rounded-xl bg-[#b3261e] text-[14px] font-bold text-white disabled:opacity-60">
        {enCours ? "…" : "Oui, annuler"}
      </button>
      <button type="button" disabled={enCours} onClick={() => setConfirmer(false)} className="min-h-11 rounded-xl bg-bg text-[14px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]">
        Non, garder
      </button>
    </div>
  );
}

function Ligne({ course, maintenant, calme = false, onAction, peutAnnuler = false, onEncaisser, peutEncaisser = false }) {
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
        {!calme && peutEncaisser && <Encaisser course={course} onEncaisser={onEncaisser} />}
        {!calme && peutAnnuler && <Annulation course={course} onAction={onAction} />}
        {calme && <p className="text-[13px] font-bold text-[#5a6366]">{STATUT[course.status]} · {libelleJour(quand, maintenant)}</p>}
      </div>
    </article>
  );
}

// En haut : les courses faites, à encaisser. Puis les courses acceptées à venir, groupées par jour.
// Enfin l'historique (terminées, refusées, annulées).
export default function Planning({ planning, historique, maintenant, onAction, onEncaisser, onAjouter, userId, role }) {
  const [ajout, setAjout] = useState(false);
  async function ajouter(corps) {
    const r = await onAjouter(corps);
    if (r.ok) setAjout(false);
    return r;
  }
  const aEncaisser = planning.filter((c) => new Date(c.pickup_at) <= maintenant).reverse(); // la plus récente d'abord
  const aVenir = planning.filter((c) => new Date(c.pickup_at) > maintenant);
  const mesCourses = (c) => role === "patron" || c.accepted_by === userId;
  const jours = [];
  for (const c of aVenir) {
    const cle = jourParis(new Date(c.pickup_at));
    const dernier = jours[jours.length - 1];
    if (dernier?.cle === cle) dernier.courses.push(c);
    else jours.push({ cle, courses: [c] });
  }
  const anciennes = historique;

  return (
    <div className="flex flex-col gap-3">
      {ajout ? (
        <AjouterCourse onAjouter={ajouter} onFermer={() => setAjout(false)} />
      ) : (
        <button type="button" onClick={() => setAjout(true)} className="min-h-[52px] rounded-xl bg-soft font-bold text-pri">+ Ajouter une course</button>
      )}
      {aEncaisser.length > 0 && (
        <section className="flex flex-col gap-2 rounded-[18px] bg-[#fff4d6] p-2.5">
          <h2 className="px-1.5 pt-1 text-[13px] font-bold uppercase tracking-[.06em] text-[#8a5a00]">
            À encaisser <Puce>{aEncaisser.length}</Puce>
          </h2>
          {aEncaisser.map((c) => (
            <Ligne key={c.id} course={c} maintenant={maintenant} onAction={onAction} onEncaisser={onEncaisser} peutAnnuler={mesCourses(c)} peutEncaisser={mesCourses(c)} />
          ))}
        </section>
      )}
      {jours.length === 0 && aEncaisser.length === 0 && (
        <p className="rounded-[18px] bg-white p-6 text-center text-[#5a6366]">Aucune course acceptée à venir.</p>
      )}
      {jours.map(({ cle, courses }) => (
        <section key={cle} className="flex flex-col gap-2">
          <h2 className="mt-2 px-0.5 text-[13px] font-bold uppercase tracking-[.06em] text-[#5a6366]">
            {libelleJour(new Date(courses[0].pickup_at), maintenant)} <Puce>{courses.length}</Puce>
          </h2>
          {courses.map((c) => (
            <Ligne key={c.id} course={c} maintenant={maintenant} onAction={onAction} peutAnnuler={mesCourses(c)} />
          ))}
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
