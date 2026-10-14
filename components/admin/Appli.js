"use client";

import { useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import ChoisirMotDePasse from "./ChoisirMotDePasse";
import BlocNotifications, { jeton } from "./BlocNotifications";
import Depliable from "./Depliable";
import { IconeAppli, IconeEquipe, IconeReglages, IconeUtilisateur } from "./icones";
import { usePush } from "./usePush";
import Equipe from "./Equipe";
import MonSite from "./MonSite";
import Promotions from "./Promotions";

const etapes = "flex flex-col gap-1 rounded-[14px] bg-bg p-3.5 text-[15px] leading-snug";

// Onglet « Appli » : trois groupes sous une petite barre de navigation.
//   Activité : Disponibilité, Mes tarifs (ouverts), Promotions   ·   Équipe (patron)   ·   Compte : compte, mot de passe, notifications, installation
// Les groupes restent montés (seulement cachés) : ce qu'on a tapé dans un formulaire n'est pas perdu quand on change de groupe.
// Les notifications descendent en bas du groupe Compte une fois activées : il n'y a plus rien à y faire.
export default function Appli({ email, role, nom, children }) {
  const push = usePush({ getToken: jeton });
  const notifications = <BlocNotifications push={push} />;
  const patron = role === "patron";
  const groupes = [
    { id: "activite", titre: "Activité", Icone: IconeReglages },
    ...(patron ? [{ id: "equipe", titre: "Équipe", Icone: IconeEquipe }] : []),
    { id: "compte", titre: "Compte", Icone: IconeUtilisateur, alerte: push.etat === "inactif" },
  ];
  const [groupe, setGroupe] = useState("activite");

  function touche(e, i) {
    const pas = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!pas) return;
    e.preventDefault();
    const suivant = groupes[(i + pas + groupes.length) % groupes.length];
    setGroupe(suivant.id);
    document.getElementById(`onglet-${suivant.id}`)?.focus();
  }

  const panneau = "flex flex-col gap-4";
  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Rubriques" className="flex gap-1 rounded-full bg-white p-1.5 shadow-[0_8px_24px_-18px_rgba(15,25,20,.5)]">
        {groupes.map(({ id, titre, Icone, alerte }, i) => {
          const actif = groupe === id;
          return (
            <button
              key={id}
              id={`onglet-${id}`}
              type="button"
              role="tab"
              aria-selected={actif}
              aria-controls={`groupe-${id}`}
              tabIndex={actif ? 0 : -1}
              onClick={() => setGroupe(id)}
              onKeyDown={(e) => touche(e, i)}
              className={`fx relative flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-[16px] font-bold ${
                actif ? "bg-pri text-white shadow-[0_10px_18px_-12px_var(--pri)]" : "text-[#4a5457] hover:bg-soft"
              }`}
            >
              <Icone className="size-5 flex-none" />
              {titre}
              {alerte && (
                <>
                  <span aria-hidden="true" className="absolute top-1.5 right-2.5 size-2.5 rounded-full bg-[#d6402f] ring-2 ring-white" />
                  <span className="sr-only"> (une action à faire)</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="groupe-activite" aria-labelledby="onglet-activite" hidden={groupe !== "activite"} className={panneau}>
        {children}
        {patron && <MonSite />}
        {patron && <Promotions />}
      </div>

      {patron && (
        <div role="tabpanel" id="groupe-equipe" aria-labelledby="onglet-equipe" hidden={groupe !== "equipe"} className={panneau}>
          <Equipe />
        </div>
      )}

      <div role="tabpanel" id="groupe-compte" aria-labelledby="onglet-compte" hidden={groupe !== "compte"} className={panneau}>
        {push.etat !== "actif" && notifications}

        <Depliable titre="Mon compte" Icone={IconeUtilisateur} ouvertParDefaut>
          <p className="text-[#5a6366]">
            {nom ? <b className="text-ink">{nom}</b> : null} {patron ? "· patron" : "· chauffeur"}
          </p>
          <p className="[overflow-wrap:anywhere] text-[#5a6366]">{email}</p>
          <button
            type="button"
            onClick={() => supabaseNavigateur().auth.signOut()}
            className="mt-2 min-h-[52px] rounded-xl bg-bg font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]"
          >
            Se déconnecter
          </button>
        </Depliable>

        <ChoisirMotDePasse email={email} />

        <TutoInstallation />

        {push.etat === "actif" && notifications}
      </div>
    </div>
  );
}

// Tuto d'installation : une barre repliée (la page reste légère), qui se déplie d'un appui.
// Le tuto du téléphone utilisé passe en premier : iPhone ou Samsung / Android.
function TutoInstallation() {
  const [iphone] = useState(() => /iPhone|iPad|iPod/.test(navigator.userAgent));
  const android = (
    <div key="android" className={etapes}>
      <b>Samsung / Android (Chrome){!iphone && " · votre téléphone"}</b>
      <span>1. Touchez les trois points en haut à droite.</span>
      <span>2. Touchez « Installer l&apos;application » (ou « Ajouter à l&apos;écran d&apos;accueil »).</span>
    </div>
  );
  const ios = (
    <div key="ios" className={etapes}>
      <b>iPhone (Safari){iphone && " · votre téléphone"}</b>
      <span>1. Touchez le bouton Partager (le carré avec une flèche vers le haut).</span>
      <span>2. Touchez « Sur l&apos;écran d&apos;accueil », puis « Ajouter ».</span>
      <span>3. Ouvrez l&apos;appli depuis la nouvelle icône, puis activez les notifications.</span>
    </div>
  );
  return (
    <Depliable titre="Installer l'appli sur le téléphone" sousTitre="À faire une seule fois" Icone={IconeAppli}>
      <p className="text-[15px] text-[#5a6366]">L&apos;icône apparaît sur l&apos;écran d&apos;accueil, comme une appli.</p>
      {iphone ? [ios, android] : [android, ios]}
    </Depliable>
  );
}
