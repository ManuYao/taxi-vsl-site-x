"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import site from "@/site.config";
import { addDays, noon, pad2, relatif, sameDay, jourLong, ymd } from "@/lib/dates";
import { CheckIcon, PhoneIcon } from "../Icons";
import AdresseInput from "./AdresseInput";
import DatePicker from "./DatePicker";
import TimePicker from "./TimePicker";
import PrixEstime from "./PrixEstime";
import Turnstile, { CLE_PUBLIQUE_TURNSTILE } from "./Turnstile";
import useEstimation from "./useEstimation";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const etiquette = "text-base font-bold";
const pleine = "sm:col-span-2";
const carte = "rounded-3xl bg-white p-6 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] sm:p-8";

// Le départ commence à la base de l'entreprise (modifiable).
const BASE = { label: site.base.ville, lat: site.base.lat, lon: site.base.lon };

// Sans clé Turnstile (développement), la vérification anti-spam est ignorée des deux côtés.
const VERIFICATION_REQUISE = Boolean(CLE_PUBLIQUE_TURNSTILE);

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
  const [session, setSession] = useState(0); // « Faire une autre demande » recrée un formulaire tout neuf
  if (!pret) {
    return <div className="min-h-[640px] rounded-3xl bg-white" aria-busy="true" />;
  }
  return <Formulaire key={session} onNouvelle={() => setSession((s) => s + 1)} />;
}

function Formulaire({ onNouvelle }) {
  const [today] = useState(() => noon(new Date()));
  const [maintenant] = useState(() => new Date().getHours());
  // Une demande = un identifiant : si le client appuie deux fois sur « Envoyer », le serveur ne l'enregistre qu'une fois.
  const [requestId] = useState(() => crypto.randomUUID());

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
  const [proposerAppel, setProposerAppel] = useState(false); // panne d'envoi : on met le téléphone en avant
  const [enCours, setEnCours] = useState(false);
  const [envoyee, setEnvoyee] = useState(null);

  // Anti-spam : jeton Turnstile (un par envoi), problème de chargement, vérification trop lente
  const [jeton, setJeton] = useState(null);
  const [cleJeton, setCleJeton] = useState(0);
  const [verifProbleme, setVerifProbleme] = useState(false);
  const [verifLente, setVerifLente] = useState(false);
  useEffect(() => {
    if (!VERIFICATION_REQUISE || jeton || verifProbleme) return;
    const minuteur = setTimeout(() => setVerifLente(true), 12000);
    return () => clearTimeout(minuteur);
  }, [jeton, verifProbleme, cleJeton]);

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

  async function envoyer(e) {
    e.preventDefault();
    if (enCours) return;
    const f = new FormData(e.currentTarget);
    const texte = (nom) => (f.get(nom) ?? "").toString().trim();
    const manque = [];
    if (!texte("depart")) manque.push(["depart", "le départ"]);
    if (!texte("arrivee")) manque.push(["arrivee", "l'arrivée"]);
    if (!texte("nom")) manque.push(["nom", "votre nom"]);
    if (texte("telephone").replace(/\D/g, "").length < 10) manque.push(["telephone", "un téléphone à 10 chiffres"]);
    setProposerAppel(false);
    setErreur(manque.length ? `Il manque ${manque.map((m) => m[1]).join(", ")}.` : "");
    if (manque.length) {
      document.getElementById(manque[0][0])?.focus(); // on amène le client sur le premier champ à remplir
      return;
    }
    if (VERIFICATION_REQUISE && !jeton) {
      if (verifProbleme) {
        setErreur("La vérification de sécurité ne fonctionne pas sur cet appareil. Appelez-nous, c'est tout aussi rapide.");
        setProposerAppel(true);
      } else {
        setErreur("Vérification de sécurité en cours. Réessayez dans un instant.");
      }
      return;
    }

    // Le texte tapé part toujours ; les coordonnées seulement si une suggestion a été choisie.
    const lieu = (nom, choisi) => ({ label: texte(nom), ...(choisi ? { lat: choisi.lat, lon: choisi.lon } : {}) });
    const demande = {
      requestId,
      depart: lieu("depart", depart),
      arrivee: lieu("arrivee", arrivee),
      ...(arretOuvert && texte("arret") ? { arret: lieu("arret", arret) } : {}),
      date: ymd(date),
      heure: `${pad2(heure)}:${pad2(minute)}`,
      passagers,
      bagages,
      conventionne,
      ...(texte("trajet-ref") ? { refTrajet: texte("trajet-ref") } : {}),
      nom: texte("nom"),
      telephone: texte("telephone"),
      email: texte("email"),
      jeton: jeton ?? "dev-sans-turnstile",
      piege: texte("m_hp"),
    };

    setEnCours(true);
    try {
      const reponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(demande),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (reponse.ok) {
        const rel = relatif(date, today);
        setEnvoyee({
          resume: `${rel ?? jourLong(date)} à ${pad2(heure)} h ${pad2(minute)}, de ${demande.depart.label} à ${demande.arrivee.label}.`,
          prix: donnees.prix ?? null,
          telephone: demande.telephone,
        });
        return;
      }
      setErreur(donnees.erreur ?? "Impossible d'envoyer la demande. Appelez-nous.");
      setProposerAppel(reponse.status >= 500 || reponse.status === 403 || reponse.status === 429);
    } catch {
      setErreur("Pas de connexion pour le moment. Vérifiez votre réseau, ou appelez-nous.");
      setProposerAppel(true);
    } finally {
      setEnCours(false);
      // Un jeton Turnstile ne sert qu'une fois : on en demande un nouveau pour un éventuel nouvel essai.
      setJeton(null);
      setVerifLente(false);
      setCleJeton((k) => k + 1);
    }
  }

  if (envoyee) {
    return (
      <div role="status" className={`flex flex-col gap-4 ${carte}`}>
        <span className="flex size-14 items-center justify-center rounded-full bg-pri">
          <CheckIcon className="size-8 text-white" />
        </span>
        <h3 className="font-title text-[28px] font-extrabold leading-tight">Demande envoyée</h3>
        <p className="text-lg">{envoyee.resume}</p>
        {envoyee.prix !== null && (
          <p className="text-lg">
            Prix estimé : <b className="tabular-nums">≈ {envoyee.prix} €</b>
            <span className="block text-[15px] text-[#5a6366]">Estimation. Le taximètre fait foi.</span>
          </p>
        )}
        <p className="text-lg">
          Le chauffeur vous rappelle au <b className="tabular-nums">{envoyee.telephone}</b> pour confirmer.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            onClick={onNouvelle}
            className="inline-flex min-h-[58px] items-center justify-center rounded-full border-2 border-ink bg-white px-[26px] text-[19px] font-bold hover:bg-soft"
          >
            Faire une autre demande
          </button>
          <a
            href={`tel:${site.telephone.lien}`}
            className="inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-pri px-[26px] text-[19px] font-bold text-white no-underline hover:bg-pri-hover"
          >
            <PhoneIcon className="size-[22px]" />
            {site.telephone.affiche}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form id="formulaire" onSubmit={envoyer} noValidate className={`grid gap-4 sm:grid-cols-2 sm:gap-x-[18px] ${carte}`}>
      <AdresseInput id="depart" label="Départ" placeholder="Ville, gare, hôpital…" defaultValue={BASE} onSelect={setDepart} />
      <AdresseInput
        key={`arrivee-${cleArrivee}`}
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

      {/* Champ piège pour les robots : invisible, hors du parcours clavier, jamais rempli par une vraie personne */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne rien écrire ici
          <input name="m_hp" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {VERIFICATION_REQUISE && !envoyee && (
        <Turnstile key={`jeton-${cleJeton}`} onJeton={setJeton} onProbleme={() => setVerifProbleme(true)} />
      )}

      {erreur && (
        <div role="alert" className={`flex flex-col gap-2 ${pleine}`}>
          <p className="font-bold text-[#b3261e]">{erreur}</p>
          {proposerAppel && (
            <a
              href={`tel:${site.telephone.lien}`}
              className="inline-flex min-h-[52px] items-center gap-2.5 self-start rounded-full bg-pri px-6 text-lg font-bold text-white no-underline hover:bg-pri-hover"
            >
              <PhoneIcon className="size-5" />
              Appeler le {site.telephone.affiche}
            </a>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={enCours}
        className={`min-h-[58px] w-full rounded-full bg-pri px-[26px] py-3.5 text-[19px] font-bold text-white hover:bg-pri-hover disabled:opacity-70 ${pleine}`}
      >
        {enCours ? "Envoi en cours…" : "Envoyer ma demande"}
      </button>
      {VERIFICATION_REQUISE && verifLente && !jeton && !verifProbleme && (
        <p className={`text-center text-sm text-[#5a6366] ${pleine}`}>
          La vérification de sécurité prend du temps. Vérifiez votre connexion, ou appelez-nous.
        </p>
      )}
      <p className={`text-center text-sm text-[#5a6366] ${pleine}`}>Sans compte. Le chauffeur vous rappelle pour confirmer.</p>
    </form>
  );
}
