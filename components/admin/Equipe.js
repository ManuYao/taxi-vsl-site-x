"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";

const champ =
  "w-full min-h-14 rounded-[14px] bg-bg px-4 py-3 text-lg shadow-[inset_0_0_0_1.5px_#e2e6e3] focus:outline-none focus:shadow-[inset_0_0_0_2px_var(--pri),0_0_0_4px_var(--soft)]";

async function appel(methode, corps) {
  const jeton = (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
  try {
    const reponse = await fetch("/api/equipe", {
      method: methode,
      headers: { Authorization: `Bearer ${jeton}`, ...(corps ? { "Content-Type": "application/json" } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const json = await reponse.json().catch(() => ({}));
    return { ok: reponse.ok, ...json };
  } catch {
    return { ok: false, erreur: "Pas de connexion. Réessayez." };
  }
}

// Réservé au patron : qui a accès à l'espace chauffeur. Ajouter une personne, lui redonner un mot de passe, couper son accès.
export default function Equipe() {
  const [equipe, setEquipe] = useState(null);
  const [erreur, setErreur] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [ouvert, setOuvert] = useState(false); // formulaire d'ajout
  const [enCours, setEnCours] = useState(false);
  const [occupe, setOccupe] = useState(null); // identifiant de la personne en cours de modification
  const [aConfirmer, setAConfirmer] = useState(null); // { id, action } : un deuxième appui valide
  const [secret, setSecret] = useState(null); // { nom, email, motDePasse, lien } : montré une seule fois
  const [copie, setCopie] = useState(false);

  const charger = useCallback(async () => {
    const r = await appel("GET");
    if (r.ok) {
      setEquipe(r.equipe);
      setErreur("");
    } else setErreur(r.erreur ?? "Impossible de lire l'équipe.");
  }, []);

  useEffect(() => {
    const t = setTimeout(charger, 0);
    return () => clearTimeout(t);
  }, [charger]);

  async function ajouter(e) {
    e.preventDefault();
    setEnCours(true);
    setErreur("");
    const r = await appel("POST", { nom, email });
    setEnCours(false);
    if (!r.ok) return setErreur(r.erreur ?? "Impossible de créer l'accès.");
    setSecret({ nom, email: email.trim().toLowerCase(), motDePasse: r.motDePasse, lien: `${window.location.origin}/admin` });
    setCopie(false);
    setNom("");
    setEmail("");
    setOuvert(false);
    charger();
  }

  async function agir(personne, action) {
    if (aConfirmer?.id !== personne.id || aConfirmer?.action !== action) {
      setAConfirmer({ id: personne.id, action });
      return;
    }
    setAConfirmer(null);
    setOccupe(personne.id);
    setErreur("");
    const r = await appel("PATCH", { id: personne.id, action });
    setOccupe(null);
    if (!r.ok) return setErreur(r.erreur ?? "Action impossible.");
    if (r.motDePasse) {
      setSecret({ nom: personne.nom, email: personne.email, motDePasse: r.motDePasse, lien: `${window.location.origin}/admin` });
      setCopie(false);
    }
    charger();
  }

  async function copier(texte) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopie(true);
    } catch {
      setCopie(false);
    }
  }

  const libelleAction = { desactiver: "Désactiver", reactiver: "Réactiver", "nouveau-mot-de-passe": "Nouveau mot de passe" };
  const boutonPetit = "min-h-11 rounded-full px-4 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3] disabled:opacity-60";

  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-white p-4">
      <h2 className="font-title text-lg font-bold">Équipe</h2>
      <p className="text-[15px] text-[#5a6366]">Les personnes qui ont accès aux courses. Vous leur donnez un mot de passe provisoire, qu&apos;elles changent à leur première connexion.</p>

      {secret && (
        <div role="status" className="flex flex-col gap-2 rounded-[14px] bg-soft p-3.5">
          <b>Accès prêt pour {secret.nom}</b>
          <span className="text-[15px] [overflow-wrap:anywhere]">Adresse : {secret.email}</span>
          <span className="text-[15px]">Mot de passe provisoire :</span>
          <span className="rounded-xl bg-white px-3 py-2 text-center font-mono text-2xl font-bold tracking-wider select-all">{secret.motDePasse}</span>
          <span className="text-[14px] text-[#5a6366]">Notez-le ou envoyez-le par SMS avec ce lien : {secret.lien}. Il ne sera plus affiché. À sa première connexion, la personne choisit son propre mot de passe.</span>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => copier(`${secret.lien}\nAdresse : ${secret.email}\nMot de passe provisoire : ${secret.motDePasse}`)} className="min-h-12 rounded-xl bg-pri font-bold text-white">
              {copie ? "Copié ✓" : "Copier le message"}
            </button>
            <button type="button" onClick={() => setSecret(null)} className="min-h-12 rounded-xl bg-white font-bold shadow-[inset_0_0_0_1.5px_#c9d1cc]">J&apos;ai noté</button>
          </div>
        </div>
      )}

      {equipe === null && !erreur && <p className="text-[#5a6366]">Chargement…</p>}
      <ul className="flex flex-col gap-2">
        {(equipe ?? []).map((p) => (
          <li key={p.id} className={`flex flex-col gap-2 rounded-[14px] bg-bg p-3 ${p.actif ? "" : "opacity-70"}`}>
            <div className="min-w-0">
              <p className="[overflow-wrap:anywhere]">
                <b>{p.nom || "Sans nom"}</b> {p.moi && <span className="text-[#5a6366]">(vous)</span>}
              </p>
              <p className="text-[14px] [overflow-wrap:anywhere] text-[#5a6366]">
                {p.email} · {p.role === "patron" ? "patron" : "chauffeur"} · {p.actif ? "actif" : "désactivé"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {[p.actif ? (p.moi ? null : "desactiver") : "reactiver", "nouveau-mot-de-passe"].filter(Boolean).map((action) => {
                const attente = aConfirmer?.id === p.id && aConfirmer?.action === action;
                return (
                  <button key={action} type="button" disabled={occupe === p.id} onClick={() => agir(p, action)} className={`${boutonPetit} ${attente ? "bg-[#b3261e] text-white shadow-none" : "bg-white"}`}>
                    {attente ? "Confirmer ?" : libelleAction[action]}
                  </button>
                );
              })}
              {aConfirmer?.id === p.id && (
                <button type="button" onClick={() => setAConfirmer(null)} className={`${boutonPetit} bg-white`}>Annuler</button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {erreur && <p role="alert" className="text-[15px] font-bold text-[#b3261e]">{erreur}</p>}

      {ouvert ? (
        <form onSubmit={ajouter} className="flex flex-col gap-3" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="equipe-nom" className="text-base font-bold">Prénom</label>
            <input id="equipe-nom" value={nom} onChange={(e) => setNom(e.target.value)} className={champ} autoComplete="off" placeholder="Ex. Alex" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="equipe-email" className="text-base font-bold">Adresse e-mail</label>
            <input id="equipe-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} autoComplete="off" placeholder="alex@exemple.fr" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="submit" disabled={enCours} className="min-h-[52px] rounded-xl bg-pri font-bold text-white disabled:opacity-60">{enCours ? "Création…" : "Créer l'accès"}</button>
            <button type="button" onClick={() => { setOuvert(false); setErreur(""); }} className="min-h-[52px] rounded-xl bg-bg font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3]">Annuler</button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setOuvert(true)} className="min-h-[52px] rounded-xl bg-soft font-bold text-pri">+ Ajouter un chauffeur</button>
      )}
    </section>
  );
}
