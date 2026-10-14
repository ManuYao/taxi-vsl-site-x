"use client";

import { useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import ChoisirMotDePasse from "./ChoisirMotDePasse";
import BlocNotifications, { jeton } from "./BlocNotifications";
import Depliable from "./Depliable";
import { IconeAppli, IconeUtilisateur } from "./icones";
import { usePush } from "./usePush";
import Equipe from "./Equipe";
import MonSite from "./MonSite";
import Promotions from "./Promotions";

const etapes = "flex flex-col gap-1 rounded-[14px] bg-bg p-3.5 text-[15px] leading-snug";

// Onglet « Appli » : le compte, l'installation sur l'écran d'accueil, la déconnexion.
// Ordre : d'abord ce qu'on ouvre souvent (Disponibilité, Mes tarifs), puis le reste replié.
// Les notifications descendent tout en bas une fois activées : il n'y a plus rien à y faire.
export default function Appli({ email, role, nom, children }) {
  const push = usePush({ getToken: jeton });
  const notifications = <BlocNotifications push={push} />;
  return (
    <div className="flex flex-col gap-4">
      {children}

      {role === "patron" && <MonSite />}

      {push.etat !== "actif" && notifications}

      {role === "patron" && <Promotions />}

      {role === "patron" && <Equipe />}

      <Depliable titre="Mon compte" Icone={IconeUtilisateur}>
        <p className="text-[#5a6366]">
          {nom ? <b className="text-ink">{nom}</b> : null} {role === "patron" ? "· patron" : "· chauffeur"}
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
