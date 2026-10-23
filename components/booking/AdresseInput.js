"use client";

import { useEffect, useId, useRef, useState } from "react";
import site from "@/site.config";
import { chercherAdresses } from "@/lib/adresse";

// Même style que les champs de BookingForm (champ / etiquette), avec de la place à droite pour la coche.
const champ =
  "w-full min-h-14 rounded-[14px] bg-bg py-3 pr-12 pl-4 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-hidden focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const etiquette = "text-base font-bold";
// Panneau des suggestions : passe au-dessus de la suite du formulaire (z-20), sous la barre mobile (z-30).
const panneau =
  "absolute inset-x-0 top-full z-20 mt-1.5 rounded-2xl bg-white p-1.5 shadow-[0_0_0_1.5px_var(--soft2),0_22px_44px_-14px_rgba(15,36,28,.5)]";

const MIN_CARACTERES = 3;
const ANTI_REBOND_MS = 250;
const PROCHE = { lat: site.base.lat, lon: site.base.lon, departement: site.departements.map((d) => d.code).join(",") }; // ex. "77,45"

const trait = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-5",
};

// Petite icône selon le genre du lieu (gare, aéroport, hôpital, ou simple repère)
function IconeLieu({ genre }) {
  if (genre === "gare") {
    return (
      <svg {...trait}>
        <rect x="5" y="3" width="14" height="14" rx="3" />
        <path d="M5 10h14M8 21l2-4M16 21l-2-4" />
        <circle cx="9" cy="13.5" r=".6" />
        <circle cx="15" cy="13.5" r=".6" />
      </svg>
    );
  }
  if (genre === "aeroport") {
    return (
      <svg {...trait}>
        <path d="M12 2.5c-.8 0-1.5.7-1.5 1.5v5.2L3 13.5v2l7.5-2.3v4.1L8.7 18.6V20l3.3-.9 3.3.9v-1.4l-1.8-1.3v-4.1l7.5 2.3v-2l-7.5-4.3V4c0-.8-.7-1.5-1.5-1.5z" />
      </svg>
    );
  }
  if (genre === "hopital") {
    return (
      <svg {...trait}>
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    );
  }
  return (
    <svg {...trait}>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

/**
 * Champ d'adresse avec suggestions (motif ARIA « combobox avec listbox »).
 * - onSelect({ label, lat, lon }) quand on choisit une suggestion ; onSelect(null) dès que le texte est modifié ensuite.
 * - onText(texte) à chaque changement du texte (saisie ou choix), appelé avant onSelect.
 * - defaultValue : un texte, ou { label, lat, lon } pour partir d'un lieu déjà choisi (ex. la base de l'entreprise).
 * Sans suggestion (service en panne, adresse inconnue) c'est un champ texte ordinaire : on peut toujours envoyer le texte.
 */
export default function AdresseInput({ id, label, facultatif, placeholder, defaultValue = "", className = "", onSelect, onText, ...props }) {
  const idAuto = useId();
  const champId = id ?? idAuto;
  const listeId = `${champId}-liste`;

  const depart = defaultValue && typeof defaultValue === "object" ? defaultValue : null;
  const [texte, setTexte] = useState(depart ? depart.label : defaultValue);
  const [choisi, setChoisi] = useState(Boolean(depart)); // une suggestion est choisie : on affiche la coche
  const [rech, setRech] = useState({ etat: "repos", liste: [] }); // repos | chargement | ok | vide | erreur
  const [ouvert, setOuvert] = useState(false); // panneau affiché (fermé par Échap, un choix ou la perte du focus)
  const [actif, setActif] = useState(-1); // option en surbrillance (flèches ou souris)

  const boite = useRef(null);
  const minuteur = useRef(null);
  const requete = useRef(null);
  const enFocus = useRef(false);
  const viaClavier = useRef(false);

  const n = rech.liste.length;
  const listeVisible = ouvert && n > 0;
  const message = ouvert && n === 0 ? (rech.etat === "chargement" ? "Recherche…" : rech.etat === "vide" ? "Aucune adresse trouvée. Vous pouvez quand même envoyer le texte saisi." : "") : "";
  // Annonce pour les lecteurs d'écran (zone vocale toujours présente, sinon l'annonce est ratée)
  const annonce = choisi
    ? `Adresse choisie : ${texte}.`
    : rech.etat === "ok"
      ? `${n} suggestion${n > 1 ? "s" : ""} disponible${n > 1 ? "s" : ""}. Flèches haut et bas pour choisir, Entrée pour valider.`
      : rech.etat === "vide"
        ? "Aucune adresse trouvée. Vous pouvez quand même envoyer le texte saisi."
        : "";

  // Au démontage : plus de minuteur ni de requête en cours
  useEffect(() => {
    return () => {
      clearTimeout(minuteur.current);
      requete.current?.abort();
    };
  }, []);

  // Un toucher ou un clic ailleurs ferme la liste (sur iPhone, toucher une zone vide ne retire pas le focus)
  useEffect(() => {
    if (!ouvert) return;
    const fermerSiAilleurs = (e) => {
      if (!boite.current?.contains(e.target)) setOuvert(false);
    };
    document.addEventListener("pointerdown", fermerSiAilleurs);
    return () => document.removeEventListener("pointerdown", fermerSiAilleurs);
  }, [ouvert]);

  // Aux flèches, l'option active reste visible (dans la liste et dans la page)
  useEffect(() => {
    if (!viaClavier.current || actif < 0) return;
    viaClavier.current = false;
    document.getElementById(`${champId}-option-${actif}`)?.scrollIntoView({ block: "nearest" });
  }, [actif, ouvert, champId]);

  function annuler() {
    clearTimeout(minuteur.current);
    requete.current?.abort();
    requete.current = null;
  }

  function chercher(q) {
    const ctrl = new AbortController();
    requete.current = ctrl;
    setRech((r) => ({ ...r, etat: "chargement" })); // l'ancienne liste reste affichée le temps de la mise à jour
    if (enFocus.current) setOuvert(true);
    chercherAdresses(q, { signal: ctrl.signal, proche: PROCHE }).then(
      (liste) => {
        if (ctrl.signal.aborted) return;
        setRech({ etat: liste.length ? "ok" : "vide", liste });
        setActif(-1);
        if (enFocus.current) setOuvert(true);
      },
      (erreur) => {
        if (ctrl.signal.aborted || erreur?.name === "AbortError") return;
        setRech({ etat: "erreur", liste: [] }); // panne : champ texte ordinaire, sans message
      },
    );
  }

  function surSaisie(e) {
    const valeur = e.target.value;
    setTexte(valeur);
    onText?.(valeur);
    if (choisi) {
      setChoisi(false);
      onSelect?.(null);
    }
    annuler();
    if (valeur.trim().length < MIN_CARACTERES) {
      setRech({ etat: "repos", liste: [] });
      setOuvert(false);
      setActif(-1);
      return;
    }
    minuteur.current = setTimeout(() => chercher(valeur.trim()), ANTI_REBOND_MS);
  }

  function choisir(lieu) {
    annuler();
    setTexte(lieu.label);
    setChoisi(true);
    setRech({ etat: "repos", liste: [] });
    setOuvert(false);
    setActif(-1);
    onText?.(lieu.label);
    onSelect?.({ label: lieu.label, lat: lieu.lat, lon: lieu.lon });
  }

  function surTouche(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (n === 0) return; // pas de suggestions : la touche garde son rôle normal
      e.preventDefault();
      const bas = e.key === "ArrowDown";
      let suivant;
      if (!listeVisible) suivant = bas ? 0 : n - 1;
      else if (bas) suivant = (actif + 1) % n;
      else suivant = actif <= 0 ? n - 1 : actif - 1;
      viaClavier.current = true;
      setOuvert(true);
      setActif(suivant);
    } else if (e.key === "Enter" && listeVisible) {
      e.preventDefault(); // la liste est ouverte : Entrée ne doit pas envoyer le formulaire
      if (actif >= 0) choisir(rech.liste[actif]);
      else setOuvert(false);
    } else if (e.key === "Escape" && listeVisible) {
      e.preventDefault();
      setOuvert(false);
      setActif(-1);
    }
  }

  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={champId} className={etiquette}>
        {label}
        {facultatif && <span className="font-normal text-[#5a6366]"> (facultatif)</span>}
      </label>

      <div ref={boite} className="relative">
        <input
          {...props}
          id={champId}
          name={champId}
          type="text"
          role="combobox"
          aria-expanded={listeVisible}
          aria-controls={listeId}
          aria-autocomplete="list"
          aria-activedescendant={listeVisible && actif >= 0 ? `${champId}-option-${actif}` : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder={placeholder}
          value={texte}
          onChange={surSaisie}
          onKeyDown={surTouche}
          onFocus={() => {
            enFocus.current = true;
            if (rech.etat === "ok" || rech.etat === "vide") setOuvert(true);
          }}
          onBlur={() => {
            enFocus.current = false;
            setOuvert(false);
            setActif(-1);
          }}
          className={champ}
        />

        {choisi && (
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 flex size-7 -translate-y-1/2 items-center justify-center rounded-full bg-pri text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        )}
        {/* Mise à jour d'une liste déjà affichée : petite roue dans le champ (la liste ne bouge pas) */}
        {rech.etat === "chargement" && n > 0 && (
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 rounded-full border-2 border-soft2 border-t-pri motion-safe:animate-spin" />
        )}

        {message && (
          <div aria-hidden="true" className={`${panneau} flex min-h-[52px] items-center gap-3 px-4 py-3 text-[17px] leading-snug text-[#5a6366]`}>
            {rech.etat === "chargement" && <span className="size-4 flex-none rounded-full border-2 border-soft2 border-t-pri motion-safe:animate-spin" />}
            {message}
          </div>
        )}

        {/* Toujours présente (masquée si vide) pour que aria-controls vise un élément qui existe */}
        <ul
          id={listeId}
          role="listbox"
          aria-label={label ? `Suggestions : ${label}` : "Suggestions"}
          aria-busy={rech.etat === "chargement"}
          hidden={!listeVisible}
          // La souris ne doit pas faire perdre le focus au champ (sinon la liste se ferme avant le clic, ou en tirant l'ascenseur)
          onMouseDown={(e) => e.preventDefault()}
          className={`${panneau} max-h-[min(36rem,75svh)] overflow-y-auto overscroll-contain`}
        >
          {rech.liste.map((lieu, i) => (
            <li
              key={`${i}-${lieu.label}`}
              id={`${champId}-option-${i}`}
              role="option"
              aria-selected={i === actif}
              onClick={() => choisir(lieu)}
              onMouseMove={() => i !== actif && setActif(i)}
              className="group flex min-h-[52px] cursor-pointer items-center gap-3 rounded-xl px-3 py-2 max-sm:scroll-mb-20 aria-selected:bg-soft aria-selected:outline-2 aria-selected:-outline-offset-2 aria-selected:outline-pri"
            >
              <span aria-hidden="true" className="flex size-10 flex-none items-center justify-center rounded-full bg-soft text-pri group-aria-selected:bg-white">
                <IconeLieu genre={lieu.genre} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-lg leading-snug font-bold text-ink [overflow-wrap:anywhere]">{lieu.titre}</span>{" "}
                <span className="block text-[15px] leading-snug text-[#5a6366] [overflow-wrap:anywhere]">{lieu.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p role="status" className="sr-only">
        {annonce}
      </p>
    </div>
  );
}
