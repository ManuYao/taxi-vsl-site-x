"use client";

import { useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import ChoisirMotDePasse from "./ChoisirMotDePasse";
import Depliable from "./Depliable";
import Equipe from "./Equipe";
import MonSite from "./MonSite";
import Promotions from "./Promotions";

const etapes = "flex flex-col gap-1 rounded-[14px] bg-bg p-3.5 text-[15px] leading-snug";

// Onglet « Appli » : le compte, l'installation sur l'écran d'accueil, la déconnexion.
export default function Appli({ email, role, nom, children }) {
  return (
    <div className="flex flex-col gap-4">
      <Depliable titre="Mon compte">
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

      {children}

      {role === "patron" && <MonSite />}

      {role === "patron" && <Promotions />}

      {role === "patron" && <Equipe />}

      <TutoInstallation />
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
    <Depliable titre="Installer l'appli sur le téléphone" sousTitre="À faire une seule fois">
      <p className="text-[15px] text-[#5a6366]">L&apos;icône apparaît sur l&apos;écran d&apos;accueil, comme une appli.</p>
      {iphone ? [ios, android] : [android, ios]}
    </Depliable>
  );
}
