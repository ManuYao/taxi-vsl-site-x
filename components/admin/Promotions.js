"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import { PORTEES } from "@/lib/promotions";
import Depliable from "./Depliable";
import { IconePromo } from "./icones";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg focus:outline-none shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const VIDE = { name: "", percent: "10", scope: "all", code: "", starts_on: "", ends_on: "" };

async function appel(methode, corps) {
  const jeton = (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
  try {
    const r = await fetch("/api/promotions", {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { "Content-Type": "application/json" } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { ok: r.ok, ...(await r.json().catch(() => ({}))) };
  } catch {
    return { ok: false, erreur: "Pas de connexion. Réessayez." };
  }
}

const dateFr = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

function periode(p) {
  if (p.starts_on && p.ends_on) return `du ${dateFr(p.starts_on)} au ${dateFr(p.ends_on)}`;
  if (p.starts_on) return `à partir du ${dateFr(p.starts_on)}`;
  if (p.ends_on) return `jusqu'au ${dateFr(p.ends_on)}`;
  return "sans limite de dates";
}

// Réservé au patron : remises en %, avec ou sans code, sur certains trajets, pendant une période.
export default function Promotions() {
  const [liste, setListe] = useState(null);
  const [form, setForm] = useState(null); // null : fermé ; { id?, ...valeurs } : création ou modification
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [aSupprimer, setASupprimer] = useState(null);

  const charger = useCallback(async () => {
    const r = await appel("GET");
    if (r.ok) {
      setListe(r.promotions);
      setErreur("");
    } else setErreur(r.erreur ?? "Impossible de lire les promotions.");
  }, []);

  useEffect(() => {
    const t = setTimeout(charger, 0);
    return () => clearTimeout(t);
  }, [charger]);

  async function enregistrer(e) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    const { id, ...valeurs } = form;
    const corps = { ...valeurs, percent: Number(String(valeurs.percent).replace(",", ".")) };
    const r = id ? await appel("PATCH", { id, ...corps, active: form.active ?? true }) : await appel("POST", corps);
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur ?? "Enregistrement impossible.");
    setForm(null);
    charger();
  }

  async function basculer(p) {
    const r = await appel("PATCH", { id: p.id, active: !p.active });
    if (!r.ok) setErreur(r.erreur ?? "Action impossible.");
    charger();
  }

  async function supprimer(p) {
    if (aSupprimer !== p.id) return setASupprimer(p.id);
    setASupprimer(null);
    const r = await appel("DELETE", { id: p.id });
    if (!r.ok) setErreur(r.erreur ?? "Suppression impossible.");
    charger();
  }

  const modifier = (p) => setForm({ id: p.id, name: p.name, percent: String(p.percent), scope: p.scope, code: p.code ?? "", starts_on: p.starts_on ?? "", ends_on: p.ends_on ?? "", active: p.active });
  const petit = "min-h-11 rounded-full bg-white px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]";

  return (
    <Depliable titre="Promotions" Icone={IconePromo}>
      <p className="text-[15px] text-[#5a6366]">
        Une remise en % sur le prix estimé. Sans code, elle s&apos;applique toute seule aux courses concernées ; avec un code, le client le saisit sur le site. Si plusieurs remises conviennent, la plus forte s&apos;applique.
      </p>

      {liste === null && !erreur && <p className="text-[#5a6366]">Chargement…</p>}
      {liste?.length === 0 && !form && <p className="rounded-[14px] bg-bg p-3.5 text-[15px] text-[#5a6366]">Aucune promotion pour le moment.</p>}

      <ul className="flex flex-col gap-2">
        {(liste ?? []).map((p) => (
          <li key={p.id} className={`flex flex-col gap-2 rounded-[14px] bg-bg p-3 ${p.active ? "" : "opacity-60"}`}>
            <div>
              <p className="[overflow-wrap:anywhere]">
                <b>{p.name}</b> <span className="rounded-full bg-pri px-2 py-0.5 text-[13px] font-bold text-white">−{p.percent} %</span>
              </p>
              <p className="text-[14px] text-[#5a6366]">
                {PORTEES[p.scope]} · {periode(p)}
                {p.code ? <> · code <b className="text-ink">{p.code}</b></> : " · sans code"} · {p.active ? "active" : "désactivée"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => basculer(p)} className={petit}>{p.active ? "Désactiver" : "Activer"}</button>
              <button type="button" onClick={() => modifier(p)} className={petit}>Modifier</button>
              <button type="button" onClick={() => supprimer(p)} className={`${petit} ${aSupprimer === p.id ? "!bg-[#b3261e] !text-white" : "text-[#b3261e]"}`}>
                {aSupprimer === p.id ? "Confirmer ?" : "Supprimer"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {erreur && <p role="alert" className="text-[15px] font-bold text-[#b3261e]">{erreur}</p>}

      {form ? (
        <form onSubmit={enregistrer} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="promo-nom" className="text-base font-bold">Nom de la promotion</label>
            <input id="promo-nom" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={champ} placeholder="Ex. Offre d'automne" autoComplete="off" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promo-pct" className="text-base font-bold">Remise (%)</label>
              <input id="promo-pct" inputMode="numeric" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} className={champ} autoComplete="off" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promo-code" className="text-base font-bold">Code <span className="font-normal text-[#5a6366]">(facultatif)</span></label>
              <input id="promo-code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`${champ} uppercase`} placeholder="AUTOMNE10" autoComplete="off" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="promo-portee" className="text-base font-bold">Trajets concernés</label>
            <select id="promo-portee" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} className={champ}>
              {Object.entries(PORTEES).map(([id, libelle]) => <option key={id} value={id}>{libelle}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promo-debut" className="text-base font-bold">Du</label>
              <input id="promo-debut" type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className={champ} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="promo-fin" className="text-base font-bold">Au (inclus)</label>
              <input id="promo-fin" type="date" value={form.ends_on} min={form.starts_on || undefined} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className={champ} />
            </div>
          </div>
          <p className="text-[14px] text-[#5a6366]">Les dates sont celles de la course (pas du jour de la réservation). Vides : sans limite.</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={enCours} className="min-h-[52px] rounded-xl bg-pri font-bold text-white disabled:opacity-60">{enCours ? "Enregistrement…" : form.id ? "Enregistrer" : "Créer la promotion"}</button>
            <button type="button" onClick={() => { setForm(null); setErreur(""); }} className="min-h-[52px] rounded-xl bg-bg font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]">Annuler</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setForm({ ...VIDE })} className="min-h-[52px] rounded-xl bg-soft font-bold text-pri">+ Nouvelle promotion</button>
      )}
    </Depliable>
  );
}
