"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import { MODES, eurosTxt } from "@/lib/caisse";
import { jourParis, libelleJour } from "@/lib/paris";
import Confirmation from "./Confirmation";
import { SqueletteCaisse } from "./Squelette";

async function jeton() {
  return (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
}

async function appel(methode, corps) {
  try {
    const r = await fetch("/api/paiements", {
      method: methode,
      headers: { Authorization: `Bearer ${await jeton()}`, "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    return { ok: r.ok, ...(await r.json().catch(() => ({}))) };
  } catch {
    return { ok: false, erreur: "Pas de connexion. Réessayez." };
  }
}

const carte = "flex flex-col gap-2 rounded-[18px] bg-white p-4";
const petit = "min-h-11 rounded-full bg-white px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3] disabled:opacity-60";

// Onglet « Caisse » (patron) : ce qui est encaissé, ce qui reste à encaisser, le tiers payant à recevoir, l'export du mois.
// `version` change dès qu'un paiement est saisi ailleurs : on relit alors les chiffres.
export default function Caisse({ version, maintenant, onChange }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const [confirmer, setConfirmer] = useState(null); // { paiement, action } : fenêtre de confirmation ouverte
  const [enCours, setEnCours] = useState(false);
  const [mois, setMois] = useState(() => jourParis(new Date()).slice(0, 7));
  const [export_, setExport] = useState({ enCours: false, message: "" });

  const charger = useCallback(async () => {
    try {
      const r = await fetch("/api/caisse", { headers: { Authorization: `Bearer ${await jeton()}` }, cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return setErreur(j.erreur ?? "Impossible de lire la caisse.");
      setDonnees(j);
      setErreur("");
    } catch {
      setErreur("Pas de connexion. Réessayez.");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(charger, 0);
    return () => clearTimeout(t);
  }, [charger, version]);

  // Appelé par la fenêtre de confirmation : elle reste ouverte avec « … » jusqu'à ce que les chiffres soient relus
  async function agir() {
    const { paiement, action } = confirmer;
    setEnCours(true);
    const r = action === "recu" ? await appel("PATCH", { id: paiement.id, action: "recu" }) : await appel("DELETE", { id: paiement.id });
    if (!r.ok) setErreur(r.erreur ?? "Action impossible.");
    await charger();
    setEnCours(false);
    setConfirmer(null);
    onChange?.();
  }

  async function telecharger() {
    setExport({ enCours: true, message: "" });
    try {
      const r = await fetch(`/api/caisse/export?mois=${mois}`, { headers: { Authorization: `Bearer ${await jeton()}` } });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).erreur ?? "Export impossible.");
      const url = URL.createObjectURL(await r.blob());
      const lien = document.createElement("a");
      lien.href = url;
      lien.download = `caisse-${mois}.csv`;
      document.body.appendChild(lien);
      lien.click();
      lien.remove();
      URL.revokeObjectURL(url);
      setExport({ enCours: false, message: "Fichier téléchargé. Ouvrez-le avec Excel ou envoyez-le à votre comptable." });
    } catch (e) {
      setExport({ enCours: false, message: e.message || "Export impossible." });
    }
  }

  if (!donnees) return erreur ? <p role="alert" className="rounded-2xl bg-[#fdecea] p-3.5 text-[15px] font-bold text-[#b3261e]">{erreur}</p> : <SqueletteCaisse />;
  const vise = confirmer?.paiement;
  const montant = vise ? eurosTxt(vise.amount_cents) : "";
  const client = vise?.bookings?.customer_name ?? "ce client";
  const fenetre =
    confirmer?.action === "recu"
      ? { titre: `${montant} reçus ?`, message: `Le tiers payant de ${client} est bien arrivé sur votre compte.`, libelle: "Oui, c'est reçu", danger: false }
      : { titre: `Annuler ce paiement de ${montant} ?`, message: `Le paiement de ${client} est retiré de la caisse. La course redevient à encaisser.`, libelle: "Oui, annuler le paiement", danger: true };
  const { resume, duJour, enAttente, aEncaisser } = donnees;
  const maxSept = Math.max(1, ...resume.sept.map((j) => j.total));
  const nomJour = (jour) => new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");

  return (
    <div className="flex flex-col gap-3">
      {erreur && <p role="alert" className="rounded-2xl bg-[#fdecea] p-3.5 text-[15px] font-bold text-[#b3261e]">{erreur}</p>}

      <section className="flex flex-col gap-2 rounded-[18px] bg-pri p-4 text-white">
        <span className="text-[15px] font-bold text-white/80">Encaissé aujourd&apos;hui</span>
        <b className="font-title text-[40px] leading-none tabular-nums">{eurosTxt(resume.aujourdhui.total)}</b>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {Object.entries(MODES).map(([id, libelle]) => (
            <span key={id} className="rounded-full bg-white/15 px-3 py-1 text-[13px] font-bold tabular-nums">{libelle} {eurosTxt(resume.aujourdhui.parMode[id])}</span>
          ))}
        </div>
        <span className="text-[14px] text-white/80">{resume.aujourdhui.nombre} paiement{resume.aujourdhui.nombre > 1 ? "s" : ""}</span>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <section className={carte}>
          <span className="text-[14px] font-bold text-[#5a6366]">Courses à encaisser</span>
          <b className="font-title text-3xl leading-none tabular-nums">{aEncaisser.nombre}</b>
          <span className="text-[14px] text-[#5a6366]">≈ {eurosTxt(aEncaisser.estime)} (voir le Planning)</span>
        </section>
        <section className={carte}>
          <span className="text-[14px] font-bold text-[#5a6366]">Tiers payant à recevoir</span>
          <b className="font-title text-3xl leading-none tabular-nums">{eurosTxt(enAttente.length ? resume.enAttente.total : 0)}</b>
          <span className="text-[14px] text-[#5a6366]">{enAttente.length} course{enAttente.length > 1 ? "s" : ""}</span>
        </section>
      </div>

      {enAttente.length > 0 && (
        <section className={carte}>
          <h2 className="font-title text-lg font-bold">À recevoir de l&apos;Assurance Maladie</h2>
          <ul className="flex flex-col gap-2">
            {enAttente.map((p) => (
              <li key={p.id} className="flex flex-col gap-2 rounded-[14px] bg-bg p-3">
                <p className="[overflow-wrap:anywhere]"><b>{p.bookings?.customer_name ?? "Client"}</b> · <span className="tabular-nums">{eurosTxt(p.amount_cents)}</span></p>
                <p className="text-[14px] text-[#5a6366] [overflow-wrap:anywhere]">{p.bookings ? `${p.bookings.from_label} → ${p.bookings.to_label}` : ""}</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setConfirmer({ paiement: p, action: "recu" })} className={petit}>
                    Marquer comme reçu
                  </button>
                  <button type="button" onClick={() => setConfirmer({ paiement: p, action: "annuler" })} className={`${petit} text-[#b3261e]`}>
                    Annuler la saisie
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={carte}>
        <h2 className="font-title text-lg font-bold">7 derniers jours</h2>
        <div className="flex h-32 items-end gap-2" role="img" aria-label={`Recettes des 7 derniers jours : ${resume.sept.map((j) => `${libelleJour(new Date(`${j.jour}T12:00:00`), maintenant)} ${eurosTxt(j.total)}`).join(", ")}`}>
          {resume.sept.map((j) => (
            <div key={j.jour} className="flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[11px] font-bold tabular-nums text-[#5a6366]">{j.total ? Math.round(j.total / 100) : ""}</span>
              <div className="w-full rounded-t-lg bg-pri" style={{ height: `${Math.max(j.total ? 6 : 2, (j.total / maxSept) * 80)}px`, opacity: j.total ? 1 : 0.2 }} />
              <span className="text-[12px] text-[#5a6366]">{nomJour(j.jour)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={carte}>
        <h2 className="font-title text-lg font-bold">Ce mois-ci</h2>
        <b className="font-title text-3xl leading-none tabular-nums">{eurosTxt(resume.mois.total)}</b>
        <p className="text-[14px] text-[#5a6366] tabular-nums">
          {Object.entries(MODES).map(([id, libelle]) => `${libelle} ${eurosTxt(resume.mois.parMode[id])}`).join(" · ")}
        </p>
      </section>

      {duJour.length > 0 && (
        <section className={carte}>
          <h2 className="font-title text-lg font-bold">Paiements du jour</h2>
          <ul className="flex flex-col gap-2">
            {duJour.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-[14px] bg-bg p-3">
                <p className="min-w-0 text-[15px] [overflow-wrap:anywhere]"><b>{p.bookings?.customer_name ?? "Client"}</b><span className="block text-[13px] text-[#5a6366]">{MODES[p.mode]}</span></p>
                <div className="flex flex-none items-center gap-2">
                  <b className="tabular-nums">{eurosTxt(p.amount_cents)}</b>
                  <button type="button" onClick={() => setConfirmer({ paiement: p, action: "annuler" })} aria-label="Annuler ce paiement" className={`${petit} px-3 text-[#b3261e]`}>
                    ×
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={carte}>
        <h2 className="font-title text-lg font-bold">Export pour le comptable</h2>
        <p className="text-[14px] text-[#5a6366]">Un fichier CSV (lisible dans Excel) avec tous les paiements du mois choisi et les totaux.</p>
        <label htmlFor="mois-export" className="text-base font-bold">Mois</label>
        <input id="mois-export" type="month" value={mois} onChange={(e) => setMois(e.target.value)} className="min-h-14 w-full rounded-[14px] bg-bg px-4 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3]" />
        <button type="button" onClick={telecharger} disabled={export_.enCours || !mois} className="min-h-[52px] rounded-xl bg-pri font-bold text-white hover:bg-pri-hover disabled:opacity-60">
          {export_.enCours ? "Préparation…" : "Télécharger le CSV"}
        </button>
        {export_.message && <p role="status" className="text-[14px] font-bold text-pri">{export_.message}</p>}
      </section>

      <Confirmation ouvert={Boolean(confirmer)} {...fenetre} enCours={enCours} onConfirmer={agir} onAnnuler={() => setConfirmer(null)} />
    </div>
  );
}
