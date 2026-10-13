"use client";

import { useState } from "react";
import site from "@/site.config";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import { IconeVoiture } from "./icones";

const champ =
  "w-full min-h-14 rounded-[14px] bg-white px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#c9d1cc] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";
const bouton = "min-h-[58px] w-full rounded-full bg-pri px-6 text-[19px] font-bold text-white hover:bg-pri-hover disabled:opacity-60";

// Connexion : e-mail + mot de passe (comptes créés par le patron). Le code reçu par e-mail reste disponible
// si site.admin.codeParEmail est vrai (il faut alors un serveur SMTP chez Supabase).
export default function Connexion() {
  const [mode, setMode] = useState("mot-de-passe"); // mot-de-passe | code-email | code-saisie
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voir, setVoir] = useState(false);
  const [code, setCode] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function seConnecter(e) {
    e.preventDefault();
    const adresse = email.trim().toLowerCase();
    if (!adresse.includes("@") || !motDePasse) return setErreur("Écrivez votre e-mail et votre mot de passe.");
    setEnCours(true);
    setErreur("");
    const { error } = await supabaseNavigateur().auth.signInWithPassword({ email: adresse, password: motDePasse });
    setEnCours(false);
    if (error) {
      setErreur(
        error.status === 429
          ? "Trop d'essais. Attendez quelques minutes puis réessayez."
          : "E-mail ou mot de passe incorrect. Demandez au patron si vous avez oublié votre mot de passe.",
      );
    }
    // En cas de succès, la session s'ouvre toute seule : AdminApp prend le relais.
  }

  async function demanderCode(e) {
    e.preventDefault();
    const adresse = email.trim().toLowerCase();
    if (!adresse.includes("@")) return setErreur("Écrivez votre adresse e-mail.");
    setEnCours(true);
    setErreur("");
    const { error } = await supabaseNavigateur().auth.signInWithOtp({
      email: adresse,
      // Seuls les comptes déjà créés par le patron peuvent se connecter
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/admin` },
    });
    setEnCours(false);
    if (error) {
      setErreur(
        error.status === 429
          ? "Trop d'essais. Attendez quelques minutes puis réessayez."
          : "Impossible d'envoyer le code. Vérifiez l'adresse, ou demandez au patron de vous créer un accès.",
      );
      return;
    }
    setEmail(adresse);
    setMode("code-saisie");
  }

  async function verifierCode(e) {
    e.preventDefault();
    const chiffres = code.replace(/\D/g, "");
    if (chiffres.length < 6) return setErreur("Écrivez les 6 chiffres reçus par e-mail.");
    setEnCours(true);
    setErreur("");
    const { error } = await supabaseNavigateur().auth.verifyOtp({ email, token: chiffres, type: "email" });
    setEnCours(false);
    if (error) setErreur("Code incorrect ou périmé. Vérifiez-le, ou demandez un nouveau code.");
  }

  function changerMode(suivant) {
    setMode(suivant);
    setErreur("");
    setCode("");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center gap-6 px-5 py-10">
      <div className="flex items-center gap-3">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-pri text-white">
          <IconeVoiture className="size-8" />
        </span>
        <div>
          <h1 className="font-title text-[26px] font-extrabold leading-tight">Espace chauffeur</h1>
          <p className="text-[#5a6366]">{site.nom}</p>
        </div>
      </div>

      {mode === "mot-de-passe" && (
        <form onSubmit={seConnecter} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-base font-bold">Votre adresse e-mail</label>
            <input id="email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} placeholder="prenom@exemple.fr" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="mdp" className="text-base font-bold">Mot de passe</label>
            <div className="relative">
              <input
                id="mdp"
                type={voir ? "text" : "password"}
                autoComplete="current-password"
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                className={`${champ} pr-28`}
              />
              <button
                type="button"
                onClick={() => setVoir(!voir)}
                aria-pressed={voir}
                className="absolute top-1/2 right-2 min-h-11 -translate-y-1/2 rounded-full px-4 text-[15px] font-bold text-pri"
              >
                {voir ? "Masquer" : "Afficher"}
              </button>
            </div>
          </div>
          {erreur && <p role="alert" className="font-bold text-[#b3261e]">{erreur}</p>}
          <button type="submit" disabled={enCours} className={bouton}>{enCours ? "Connexion…" : "Me connecter"}</button>
          {site.admin.codeParEmail && (
            <button type="button" onClick={() => changerMode("code-email")} className="min-h-12 font-bold text-pri">
              Recevoir un code par e-mail à la place
            </button>
          )}
          <p className="text-[15px] text-[#5a6366]">Mot de passe oublié ? Demandez au patron de vous en donner un nouveau.</p>
        </form>
      )}

      {mode === "code-email" && (
        <form onSubmit={demanderCode} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email-code" className="text-base font-bold">Votre adresse e-mail</label>
            <input id="email-code" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} placeholder="prenom@exemple.fr" />
          </div>
          {erreur && <p role="alert" className="font-bold text-[#b3261e]">{erreur}</p>}
          <button type="submit" disabled={enCours} className={bouton}>{enCours ? "Envoi…" : "Recevoir mon code"}</button>
          <button type="button" onClick={() => changerMode("mot-de-passe")} className="min-h-12 font-bold text-pri">
            Utiliser mon mot de passe
          </button>
        </form>
      )}

      {mode === "code-saisie" && (
        <form onSubmit={verifierCode} className="flex flex-col gap-4" noValidate>
          <p className="text-lg">Un code a été envoyé à <b>{email}</b>. Il arrive en quelques secondes.</p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="code" className="text-base font-bold">Code reçu par e-mail</label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${champ} text-center font-title text-3xl tracking-[.3em] tabular-nums`}
              placeholder="······"
              maxLength={10}
            />
          </div>
          {erreur && <p role="alert" className="font-bold text-[#b3261e]">{erreur}</p>}
          <button type="submit" disabled={enCours} className={bouton}>{enCours ? "Vérification…" : "Me connecter"}</button>
          <button type="button" onClick={() => changerMode("code-email")} className="min-h-12 font-bold text-pri">
            Changer d&apos;adresse ou redemander un code
          </button>
        </form>
      )}
    </main>
  );
}
