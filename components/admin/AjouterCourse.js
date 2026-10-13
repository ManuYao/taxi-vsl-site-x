"use client";

import { useState } from "react";
import site from "@/site.config";
import { noon, pad2, ymd } from "@/lib/dates";
import AdresseInput from "../booking/AdresseInput";
import DatePicker from "../booking/DatePicker";
import PrixEstime from "../booking/PrixEstime";
import TimePicker from "../booking/TimePicker";
import useEstimation from "../booking/useEstimation";

const champ =
  "w-full min-h-14 rounded-[14px] bg-white px-4 py-3 text-lg focus:outline-none shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const BASE = { label: site.base.ville, lat: site.base.lat, lon: site.base.lon };

// Ajouter soi-même une course au planning (un client vient d'appeler, ou on l'a prise dans la rue).
// onAjouter(corps) renvoie une promesse { ok, erreur? } ; la course est créée directement « acceptée ».
export default function AjouterCourse({ onAjouter, onFermer }) {
  const [today] = useState(() => noon(new Date()));
  const [maintenant] = useState(() => new Date().getHours());
  const [requestId] = useState(() => crypto.randomUUID());

  const [depart, setDepart] = useState(BASE);
  const [arrivee, setArrivee] = useState(null);
  const [arriveeInitiale, setArriveeInitiale] = useState("");
  const [cleArrivee, setCleArrivee] = useState(0);
  const [date, setDate] = useState(() => noon(new Date()));
  const [heure, setHeure] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => Math.floor(new Date().getMinutes() / 15) * 15);
  const [passagers, setPassagers] = useState(1);
  const [conventionne, setConventionne] = useState(false);
  const [bagages, setBagages] = useState(false);
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [montant, setMontant] = useState("");
  const [erreur, setErreur] = useState("");
  const [enCours, setEnCours] = useState(false);

  const max = site.reservation.maxPassagers;
  const estimation = useEstimation({ depart, arrivee, arret: null, date: ymd(date), heure: `${pad2(heure)}:${pad2(minute)}`, code: "" });

  function toutDeSuite() {
    const maintenantExact = new Date();
    setDate(noon(maintenantExact));
    setHeure(maintenantExact.getHours());
    setMinute(Math.floor(maintenantExact.getMinutes() / 15) * 15);
  }

  function choisirDestination(d) {
    const lieu = { label: d.libelle ?? d.nom, lat: d.lat, lon: d.lon };
    setArrivee(lieu);
    setArriveeInitiale(lieu);
    setCleArrivee((k) => k + 1);
  }

  async function valider(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texte = (n) => (f.get(n) ?? "").toString().trim();
    const manque = [];
    if (!texte("depart")) manque.push(["depart", "le départ"]);
    if (!texte("arrivee")) manque.push(["arrivee", "l'arrivée"]);
    if (!nom.trim()) manque.push(["ajout-nom", "le nom du client"]);
    if (telephone.replace(/\D/g, "").length < 10) manque.push(["ajout-tel", "son téléphone (10 chiffres)"]);
    setErreur(manque.length ? `Il manque ${manque.map((m) => m[1]).join(", ")}.` : "");
    if (manque.length) return document.getElementById(manque[0][0])?.focus();

    const lieu = (n, choisi) => ({ label: texte(n), ...(choisi ? { lat: choisi.lat, lon: choisi.lon } : {}) });
    setEnCours(true);
    const r = await onAjouter({
      requestId,
      depart: lieu("depart", depart),
      arrivee: lieu("arrivee", arrivee),
      date: ymd(date),
      heure: `${pad2(heure)}:${pad2(minute)}`,
      passagers,
      bagages,
      conventionne,
      nom: nom.trim(),
      telephone: telephone.trim(),
      ...(montant.trim() ? { montant: montant.trim() } : {}),
    });
    setEnCours(false);
    if (!r.ok) setErreur(r.erreur ?? "Impossible d'ajouter la course.");
  }

  const etiquette = "text-base font-bold";
  return (
    <form onSubmit={valider} noValidate className="flex flex-col gap-4 rounded-[18px] bg-white p-4 shadow-[0_8px_20px_-16px_rgba(15,25,20,.6)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-title text-lg font-bold">Ajouter une course</h2>
        <button type="button" onClick={onFermer} className="min-h-11 rounded-full px-3 text-[15px] font-bold text-[#5a6366]">Fermer</button>
      </div>
      <p className="-mt-2 text-[14px] text-[#5a6366]">Un client appelle, ou vous venez de le prendre : la course est ajoutée directement à votre planning.</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ajout-nom" className={etiquette}>Nom du client</label>
        <input id="ajout-nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="off" placeholder="Ex. Mme Martin" className={champ} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ajout-tel" className={etiquette}>Téléphone</label>
        <input id="ajout-tel" type="tel" inputMode="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoComplete="off" placeholder="06 12 34 56 78" className={champ} />
      </div>

      <AdresseInput id="depart" label="Départ" placeholder="Ville, gare, hôpital…" defaultValue={BASE} onSelect={setDepart} />
      <AdresseInput key={`arrivee-${cleArrivee}`} id="arrivee" label="Arrivée" placeholder="Ville, gare, aéroport…" defaultValue={arriveeInitiale} onSelect={setArrivee} />
      <div className="flex flex-wrap items-center gap-2">
        {site.destinations.map((d) => (
          <button key={d.nom} type="button" aria-label={`Arrivée : ${d.libelle ?? d.nom}`} onClick={() => choisirDestination(d)} className="min-h-11 rounded-full bg-bg px-3.5 text-[15px] shadow-[inset_0_0_0_1.5px_#e2e6e3] hover:bg-soft">
            {d.nom}
          </button>
        ))}
      </div>

      <button type="button" onClick={toutDeSuite} className="min-h-12 self-start rounded-full bg-soft px-5 font-bold text-pri">Tout de suite</button>
      <DatePicker today={today} value={date} onChange={setDate} />
      <TimePicker today={today} maintenant={maintenant} date={date} hour={heure} minute={minute} permettrePasse onChange={(h, m) => { setHeure(h); setMinute(m); }} />

      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="flex w-[180px] flex-col gap-1.5">
          <span id="ajout-pax" className={etiquette}>Passagers</span>
          <div role="group" aria-labelledby="ajout-pax" className="flex min-h-14 items-center overflow-hidden rounded-[14px] bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]">
            <button type="button" aria-label="Un passager de moins" disabled={passagers <= 1} onClick={() => setPassagers(passagers - 1)} className="w-12 self-stretch text-[26px] font-bold text-pri disabled:opacity-30">−</button>
            <output aria-live="polite" className="flex-1 text-center font-bold tabular-nums">{passagers}</output>
            <button type="button" aria-label="Un passager de plus" disabled={passagers >= max} onClick={() => setPassagers(passagers + 1)} className="w-12 self-stretch text-[26px] font-bold text-pri disabled:opacity-30">+</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[["Conventionné", conventionne, setConventionne], ["Bagages", bagages, setBagages]].map(([t, v, set]) => (
            <label key={t} className={`inline-flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2.5 text-base ${v ? "bg-soft shadow-[inset_0_0_0_2px_var(--pri)]" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"}`}>
              <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="m-0 size-[22px] accent-pri" />
              {t}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ajout-montant" className={etiquette}>Prix convenu (€) <span className="font-normal text-[#5a6366]">(facultatif)</span></label>
        <input id="ajout-montant" inputMode="decimal" value={montant} onChange={(e) => setMontant(e.target.value)} autoComplete="off" placeholder="Sinon : l'estimation, ou le taximètre" className={champ} />
      </div>
      {!montant.trim() && <PrixEstime statut={estimation.statut} resultat={estimation.resultat} conventionne={false} />}

      {erreur && <p role="alert" className="font-bold text-[#b3261e]">{erreur}</p>}
      <button type="submit" disabled={enCours} className="min-h-[58px] rounded-full bg-pri px-6 text-[19px] font-bold text-white hover:bg-pri-hover disabled:opacity-60">
        {enCours ? "Ajout…" : "Ajouter au planning"}
      </button>
    </form>
  );
}
