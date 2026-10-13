"use client";

import { supabaseNavigateur } from "@/lib/supabase-browser";
import ChoisirMotDePasse from "./ChoisirMotDePasse";
import Equipe from "./Equipe";

const etapes = "flex flex-col gap-1 rounded-[14px] bg-bg p-3.5 text-[15px] leading-snug";

// Onglet « Appli » : le compte, l'installation sur l'écran d'accueil, la déconnexion.
export default function Appli({ email, role, nom, children }) {
  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1 rounded-[18px] bg-white p-4">
        <h2 className="font-title text-lg font-bold">Mon compte</h2>
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
      </section>

      <ChoisirMotDePasse email={email} />

      {children}

      {role === "patron" && <Equipe />}

      <section className="flex flex-col gap-3 rounded-[18px] bg-white p-4">
        <h2 className="font-title text-lg font-bold">Installer l&apos;appli sur le téléphone</h2>
        <p className="text-[15px] text-[#5a6366]">À faire une seule fois : l&apos;icône apparaît sur l&apos;écran d&apos;accueil, comme une appli.</p>
        <div className={etapes}>
          <b>Samsung / Android (Chrome)</b>
          <span>1. Touchez les trois points en haut à droite.</span>
          <span>2. Touchez « Installer l&apos;application » (ou « Ajouter à l&apos;écran d&apos;accueil »).</span>
        </div>
        <div className={etapes}>
          <b>iPhone (Safari)</b>
          <span>1. Touchez le bouton Partager (le carré avec une flèche vers le haut).</span>
          <span>2. Touchez « Sur l&apos;écran d&apos;accueil », puis « Ajouter ».</span>
          <span>3. Ouvrez l&apos;appli depuis la nouvelle icône, puis activez les notifications.</span>
        </div>
      </section>
    </div>
  );
}
