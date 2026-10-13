"use client";

import { useState, useSyncExternalStore } from "react";
import site from "@/site.config";
import { addDays, noon, pad2, relatif, sameDay, jourLong, ymd } from "@/lib/dates";
import AdresseInput from "./AdresseInput";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import PrixEstime from "./PrixEstime";
import useEstimation from "./useEstimation";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const etiquette = "text-base font-bold";
const pleine = "sm:col-span-2";

// Le départ commence à la base de l'entreprise (modifiable).
const BASE = { label: site.base.ville, lat: site.base.lat, lon: site.base.lon };

function Champ({ id, label, facultatif, className = "", ...props }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={etiquette}>
        {label}
        {facultatif && <span className="font-normal text-[#5a6366]"> (facultatif)</span>}
      </label>
      <input id={id} name={id} className={champ} {...props} />
    </div>
  );
}

// Le formulaire dépend de la date du jour : on ne l'affiche qu'une fois dans le navigateur
// (sinon la page pré-calculée afficherait « Aujourd'hui » avec la date du jour de la construction).
const jamais = () => () => {};
function useDansLeNavigateur() {
  return useSyncExternalStore(jamais, () => true, () => false);
}

export default function BookingForm() {
  const pret = useDansLeNavigateur();
  if (!pret) {
    return <div className="min-h-[640px] rounded-3xl bg-white" aria-busy="true" />;
  }
  return <Formulaire />;
}

function Formulaire() {
  const [today] = useState(() => noon(new Date()));
  const [maintenant] = useState(() => new Date().getHours());

  // Lieux : { label, lat, lon } une fois une suggestion choisie, null tant que le texte est libre.
  const [depart, setDepart] = useState(BASE);
  const [arrivee, setArrivee] = useState(null);
  const [arret, setArret] = useState(null);
  const [arretTexte, setArretTexte] = useState("");
  const [arretOuvert, setArretOuvert] = useState(false);
  // Les raccourcis de destination remplissent le champ Arrivée : on le recrée avec sa nouvelle valeur.
  const [arriveeInitiale, setArriveeInitiale] = useState("");
  const [cleArrivee, setCleArrivee] = useState(0);

  const [date, setDate] = useState(() => addDays(noon(new Date()), 1));
  const [heure, setHeure] = useState(8);
  const [minute, setMinute] = useState(30);
  const [passagers, setPassagers] = useState(2);
  const [conventionne, setConventionne] = useState(false);
  const [bagages, setBagages] = useState(false);
  const [erreur, setErreur] = useState("");
  const [recap, setRecap] = useState("");

  const max = site.reservation.maxPassagers;

  // Prix estimé par le serveur. Si un arrêt est écrit sans avoir été choisi dans la liste,
  // on n'affiche pas un prix « sans arrêt » qui serait trompeur.
  const arretEnAttente = arretOuvert && arretTexte.trim() !== "" && !arret;
  const estimation = useEstimation({
    depart: arretEnAttente ? null : depart,
    arrivee,
    arret: arretOuvert ? arret : null,
    date: ymd(date),
    heure: `${pad2(heure)}:${pad2(minute)}`,
  });

  // Si on choisit « aujourd'hui », l'heure ne peut pas être déjà passée.
  function changerDate(d) {
    setDate(d);
    if (sameDay(d, today) && heure <= maintenant && maintenant < 23) setHeure(maintenant + 1);
  }

  function choisirDestination(d) {
    const lieu = { label: d.libelle ?? d.nom, lat: d.lat, lon: d.lon };
    setArrivee(lieu);
    setArriveeInitiale(lieu);
    setCleArrivee((k) => k + 1);
  }

  function retirerArret() {
    setArretOuvert(false);
    setArret(null);
    setArretTexte("");
  }

  function envoyer(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const texte = (nom) => (f.get(nom) ?? "").toString().trim();
    const manque = [];
    if (!texte("depart")) manque.push(["depart", "le départ"]);
    if (!texte("arrivee")) manque.push(["arrivee", "l'arrivée"]);
    if (!texte("nom")) manque.push(["nom", "votre nom"]);
    if (texte("telephone").replace(/\D/g, "").length < 10) manque.push(["telephone", "un téléphone à 10 chiffres"]);
    setErreur(manque.length ? `Il manque ${manque.map((m) => m[1]).join(", ")}.` : "");
    if (manque.length) {
      document.getElementById(manque[0][0])?.focus(); // on amène le client sur le premier champ à remplir
      return;
    }

    const rel = relatif(date, today);
    const prix = estimation.statut === "ok" ? ` Prix estimé : ≈ ${estimation.resultat.prix} €.` : "";
    setRecap(`${rel ?? jourLong(date)} à ${pad2(heure)} h ${pad2(minute)}, de ${texte("depart")} à ${texte("arrivee")}.${prix}`);
    // L'envoi réel (serveur, base de données, notifications) arrive au bloc D.
  }

  return (
    <form
      id="formulaire"
      onSubmit={envoyer}
      noValidate
      className="grid gap-4 rounded-3xl bg-white p-6 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] sm:grid-cols-2 sm:gap-x-[18px] sm:p-8"
    >
      <AdresseInput id="depart" label="Départ" placeholder="Ville, gare, hôpital…" defaultValue={BASE} onSelect={setDepart} />
      <AdresseInput
        key={cleArrivee}
        id="arrivee"
        label="Arrivée"
        placeholder="Ville, gare, aéroport…"
        defaultValue={arriveeInitiale}
        onSelect={setArrivee}
      />

      <div className={`flex flex-wrap items-center gap-2 ${pleine}`}>
        <span className="text-[15px] font-bold text-[#5a6366]">Arrivée rapide :</span>
        {site.destinations.map((d) => (
          <button
            key={d.nom}
            type="button"
            aria-label={`Arrivée : ${d.libelle ?? d.nom}`}
            onClick={() => choisirDestination(d)}
            className="min-h-12 rounded-full bg-bg px-4 text-base shadow-[inset_0_0_0_1.5px_#e2e6e3] hover:bg-soft"
          >
            {d.nom}
          </button>
        ))}
      </div>

      {arretOuvert ? (
        <div className={`flex items-end gap-2.5 ${pleine}`}>
          <AdresseInput
            id="arret"
            label="Arrêt en chemin"
            className="flex-1"
            placeholder="Ex. prendre un collègue à Amilly"
            onSelect={setArret}
            onText={setArretTexte}
          />
          <button
            type="button"
            aria-label="Retirer l'arrêt"
            onClick={retirerArret}
            className="size-14 flex-none rounded-[14px] bg-bg text-[22px] text-[#5a6366] shadow-[inset_0_0_0_1.5px_#e2e6e3]"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setArretOuvert(true)}
          className={`inline-flex items-center gap-2 justify-self-start py-1 text-base font-bold text-pri ${pleine}`}
        >
          <i className="inline-flex size-[26px] items-center justify-center rounded-full bg-soft text-lg not-italic">+</i>
          Ajouter un arrêt en chemin
        </button>
      )}

      <div className={pleine}>
        <DatePicker today={today} value={date} onChange={changerDate} />
      </div>
      <div className={pleine}>
        <TimePicker
          today={today}
          maintenant={maintenant}
          date={date}
          hour={heure}
          minute={minute}
          onChange={(h, m) => {
            setHeure(h);
            setMinute(m);
          }}
        />
      </div>

      <div className={`flex flex-wrap items-end gap-x-4 gap-y-3 ${pleine}`}>
        <div className="flex w-[180px] flex-col gap-1.5">
          <span id="pax-label" className={etiquette}>Passagers</span>
          <div role="group" aria-labelledby="pax-label" className="flex min-h-14 items-center overflow-hidden rounded-[14px] bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]">
            <button type="button" aria-label="Un passager de moins" disabled={passagers <= 1} onClick={() => setPassagers(passagers - 1)} className="w-12 self-stretch text-[26px] font-bold text-pri disabled:opacity-30">
              −
            </button>
            <output aria-live="polite" className="flex-1 text-center font-bold tabular-nums">
              {passagers}
              {passagers === max ? " max." : ""}
            </output>
            <button type="button" aria-label="Un passager de plus" disabled={passagers >= max} onClick={() => setPassagers(passagers + 1)} className="w-12 self-stretch text-[26px] font-bold text-pri disabled:opacity-30">
              +
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {[
            ["Transport conventionné", conventionne, setConventionne],
            ["Bagages", bagages, setBagages],
          ].map(([t, v, set]) => (
            <label
              key={t}
              className={`inline-flex cursor-pointer items-center gap-2.5 rounded-full px-4 py-2.5 text-base ${
                v ? "bg-soft shadow-[inset_0_0_0_2px_var(--pri)]" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"
              }`}
            >
              <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="m-0 size-[22px] accent-pri" />
              {t}
            </label>
          ))}
        </div>
      </div>

      <Champ id="trajet-ref" label="Numéro de vol ou de train" facultatif className={pleine} autoComplete="off" placeholder="Ex. AF1234 ou TGV 6789" />

      <div className={pleine}>
        <PrixEstime
          statut={estimation.statut}
          resultat={estimation.resultat}
          conventionne={conventionne}
          messageVide={arretEnAttente ? "Choisissez l'adresse de l'arrêt dans la liste pour voir le prix." : undefined}
        />
      </div>

      <Champ id="nom" label="Nom" autoComplete="name" placeholder="Ex. Mme Martin" />
      <Champ id="telephone" label="Téléphone" type="tel" inputMode="tel" autoComplete="tel" placeholder="06 12 34 56 78" />
      <Champ id="email" label="E-mail" facultatif type="email" className={pleine} autoComplete="email" placeholder="pour recevoir la confirmation" />

      {erreur && (
        <p role="alert" className={`font-bold text-[#b3261e] ${pleine}`}>
          {erreur}
        </p>
      )}
      {recap && (
        <div className={`flex flex-col gap-1 rounded-2xl bg-soft px-[18px] py-3.5 ${pleine}`} role="status">
          <strong className="text-[19px] text-[#1e7a45]">Demande prête</strong>
          <span>{recap}</span>
          <span className="tbd self-start text-[15px]">Démonstration : rien n&apos;est encore envoyé.</span>
        </div>
      )}

      <button
        type="submit"
        className={`min-h-[58px] w-full rounded-full bg-pri px-[26px] py-3.5 text-[19px] font-bold text-white hover:bg-pri-hover ${pleine}`}
      >
        Envoyer ma demande
      </button>
      <p className={`text-center text-sm text-[#5a6366] ${pleine}`}>Sans compte. Le chauffeur vous rappelle pour confirmer.</p>
    </form>
  );
}
