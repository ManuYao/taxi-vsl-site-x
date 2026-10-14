"use client";

import { useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import Depliable from "./Depliable";
import { IconeCadenas } from "./icones";

const champ =
  "w-full min-h-14 rounded-[14px] bg-white px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#c9d1cc] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const LONGUEUR_MIN = 10;

// Choix d'un nouveau mot de passe. `obligatoire` : premier accès avec le mot de passe provisoire donné par le patron
// (plein écran, on ne peut pas passer). Sinon : formulaire de l'onglet « Appli ».
export default function ChoisirMotDePasse({ obligatoire = false, email = "", onFait }) {
  const [ancien, setAncien] = useState("");
  const [mdp, setMdp] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [voir, setVoir] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [fait, setFait] = useState(false);

  async function valider(e) {
    e.preventDefault();
    if (!obligatoire && !ancien) return setErreur("Indiquez votre mot de passe actuel.");
    if (mdp.length < LONGUEUR_MIN) return setErreur(`Choisissez au moins ${LONGUEUR_MIN} caractères.`);
    if (email && mdp.toLowerCase() === email.toLowerCase()) return setErreur("Le mot de passe ne doit pas être votre adresse e-mail.");
    if (mdp !== confirmation) return setErreur("Les deux mots de passe ne sont pas identiques.");
    setEnCours(true);
    setErreur("");
    const sb = supabaseNavigateur();
    if (!obligatoire) {
      // Preuve que c'est bien vous : on reconnecte le compte avec l'ancien mot de passe avant d'accepter le nouveau
      const { error: refus } = await sb.auth.signInWithPassword({ email, password: ancien });
      if (refus) {
        setEnCours(false);
        return setErreur("Le mot de passe actuel n'est pas le bon.");
      }
    }
    const { error } = await sb.auth.updateUser({ password: mdp, data: { doit_changer_mdp: false } });
    setEnCours(false);
    if (error) {
      setErreur(
        /same|different/i.test(error.message)
          ? "Choisissez un mot de passe différent de l'ancien."
          : "Impossible de changer le mot de passe pour le moment. Réessayez.",
      );
      return;
    }
    setAncien("");
    setMdp("");
    setConfirmation("");
    setFait(true);
    onFait?.();
  }

  const formulaire = (
    <form onSubmit={valider} className="flex flex-col gap-4" noValidate>
      {!obligatoire && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="ancien-mdp" className="text-base font-bold">Mot de passe actuel</label>
          <input id="ancien-mdp" type={voir ? "text" : "password"} autoComplete="current-password" value={ancien} onChange={(e) => setAncien(e.target.value)} className={champ} />
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nouveau-mdp" className="text-base font-bold">Nouveau mot de passe</label>
        <div className="relative">
          <input id="nouveau-mdp" type={voir ? "text" : "password"} autoComplete="new-password" value={mdp} onChange={(e) => setMdp(e.target.value)} className={`${champ} pr-28`} />
          <button type="button" onClick={() => setVoir(!voir)} aria-pressed={voir} className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 rounded-full px-4 text-[15px] font-bold text-pri">
            {voir ? "Masquer" : "Afficher"}
          </button>
        </div>
        <span className="text-sm text-[#5a6366]">Au moins {LONGUEUR_MIN} caractères. Une phrase facile à retenir est idéale.</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="confirmation-mdp" className="text-base font-bold">Répétez-le</label>
        <input id="confirmation-mdp" type={voir ? "text" : "password"} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} className={champ} />
      </div>
      {erreur && <p role="alert" className="font-bold text-[#b3261e]">{erreur}</p>}
      {fait && !obligatoire && <p role="status" className="font-bold text-pri">✓ Mot de passe changé.</p>}
      <button type="submit" disabled={enCours} className="min-h-[58px] w-full rounded-full bg-pri px-6 text-[19px] font-bold text-white hover:bg-pri-hover disabled:opacity-60">
        {enCours ? "Enregistrement…" : obligatoire ? "Enregistrer et continuer" : "Changer mon mot de passe"}
      </button>
    </form>
  );

  if (!obligatoire) {
    return (
      <Depliable titre="Changer mon mot de passe" Icone={IconeCadenas}>
        {formulaire}
      </Depliable>
    );
  }
  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center gap-5 px-5 py-10">
      <h1 className="font-title text-[26px] font-extrabold leading-tight">Choisissez votre mot de passe</h1>
      <p className="text-lg text-[#5a6366]">Le mot de passe provisoire donné par le patron ne sert qu&apos;une fois. Choisissez le vôtre, que vous seul connaissez.</p>
      {formulaire}
    </main>
  );
}
