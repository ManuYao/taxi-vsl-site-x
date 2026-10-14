"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import Depliable from "./Depliable";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg tabular-nums shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";

const CHAMPS = [
  { cle: "priseEnCharge", libelle: "Prise en charge", aide: "Prix de départ de toute course" },
  { cle: "kmJour", libelle: "Prix du km, de jour", aide: "De 7 h à 19 h, sauf le dimanche" },
  { cle: "kmNuit", libelle: "Prix du km, de nuit et dimanche", aide: "Avant 7 h, après 19 h, et le dimanche" },
  { cle: "minimum", libelle: "Prix minimum d'une course", aide: "Une course ne coûte jamais moins" },
];

const enTexte = (n) => String(n).replace(".", ",");

async function appel(methode, corps) {
  const jeton = (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
  try {
    const r = await fetch("/api/reglages", {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { "Content-Type": "application/json" } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    return { ok: r.ok, ...(await r.json().catch(() => ({}))) };
  } catch {
    return { ok: false, erreur: "Pas de connexion. Réessayez." };
  }
}

// Réservé au patron : « Mon site ». Pour l'instant, les tarifs qui servent au prix estimé affiché aux clients.
export default function MonSite() {
  const [valeurs, setValeurs] = useState(null); // textes saisis
  const [confirmes, setConfirmes] = useState(false);
  const [message, setMessage] = useState(null); // { ton, texte }
  const [enCours, setEnCours] = useState(false);

  const charger = useCallback(async () => {
    const r = await appel("GET");
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.erreur ?? "Impossible de lire les tarifs." });
    setValeurs(Object.fromEntries(CHAMPS.map(({ cle }) => [cle, enTexte(r.tarifs[cle])])));
    setConfirmes(r.tarifs.confirmes === true);
  }, []);

  useEffect(() => {
    const t = setTimeout(charger, 0);
    return () => clearTimeout(t);
  }, [charger]);

  async function enregistrer(e) {
    e.preventDefault();
    setEnCours(true);
    setMessage(null);
    const r = await appel("PATCH", valeurs);
    setEnCours(false);
    if (!r.ok) return setMessage({ ton: "erreur", texte: r.erreur ?? "Enregistrement impossible." });
    setValeurs(Object.fromEntries(CHAMPS.map(({ cle }) => [cle, enTexte(r.tarifs[cle])])));
    setConfirmes(true);
    setMessage({ ton: "ok", texte: "Tarifs enregistrés. Les nouveaux prix estimés s'affichent tout de suite sur le site." });
  }

  return (
    <Depliable titre="Mes tarifs" ouvertParDefaut>
      <p className="text-[15px] text-[#5a6366]">
        Ils servent à calculer le prix estimé que voient les clients avant de réserver. Le prix final reste celui du taximètre.
      </p>
      {!confirmes && valeurs && (
        <p className="rounded-[14px] bg-[#fff4d6] p-3 text-[15px] font-bold text-[#8a5a00]">
          Ces tarifs sont encore ceux de démonstration. Enregistrez les vôtres : le site arrêtera d&apos;afficher « tarifs fictifs ».
        </p>
      )}
      {valeurs === null && !message && <p className="text-[#5a6366]">Chargement…</p>}
      {valeurs && (
        <form onSubmit={enregistrer} className="flex flex-col gap-3" noValidate>
          {CHAMPS.map(({ cle, libelle, aide }) => (
            <div key={cle} className="flex flex-col gap-1.5">
              <label htmlFor={`tarif-${cle}`} className="text-base font-bold">{libelle} <span className="font-normal text-[#5a6366]">(en €)</span></label>
              <input id={`tarif-${cle}`} inputMode="decimal" autoComplete="off" value={valeurs[cle]} onChange={(e) => setValeurs({ ...valeurs, [cle]: e.target.value })} className={champ} />
              <span className="text-[14px] text-[#5a6366]">{aide}</span>
            </div>
          ))}
          {message && <p role={message.ton === "erreur" ? "alert" : "status"} className={`text-[15px] font-bold ${message.ton === "ok" ? "text-pri" : "text-[#b3261e]"}`}>{message.texte}</p>}
          <button type="submit" disabled={enCours} className="min-h-[52px] rounded-xl bg-pri font-bold text-white hover:bg-pri-hover disabled:opacity-60">
            {enCours ? "Enregistrement…" : "Enregistrer mes tarifs"}
          </button>
        </form>
      )}
      {valeurs === null && message && <p role="alert" className="text-[15px] font-bold text-[#b3261e]">{message.texte}</p>}
    </Depliable>
  );
}
