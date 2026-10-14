"use client";

import { useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import Depliable from "./Depliable";
import { IconeCloche } from "./icones";

export const jeton = async () => (await supabaseNavigateur().auth.getSession()).data.session?.access_token ?? null;
const bouton = "min-h-[52px] w-full rounded-xl px-4 font-bold disabled:opacity-60";

// Notifications push : l'état de cet appareil et les boutons pour l'activer, le tester, le désactiver.
// `push` : le résultat de usePush(), appelé dans Appli (qui place ce bloc selon l'état).
export default function BlocNotifications({ push }) {
  const { etat, activer, desactiver, erreur, occupe } = push;
  const [essai, setEssai] = useState(null); // { ton, texte }
  const [essaiEnCours, setEssaiEnCours] = useState(false);

  async function envoyerEssai() {
    setEssaiEnCours(true);
    setEssai(null);
    try {
      const reponse = await fetch("/api/push/test", { method: "POST", headers: { Authorization: `Bearer ${await jeton()}` } });
      const j = await reponse.json().catch(() => ({}));
      setEssai(
        reponse.ok && j.ok
          ? { ton: "ok", texte: "Notification envoyée. Elle doit s'afficher dans quelques secondes." }
          : { ton: "erreur", texte: j.erreur ?? "Aucune notification envoyée. Réactivez les notifications sur cet appareil." },
      );
    } catch {
      setEssai({ ton: "erreur", texte: "Pas de connexion. Réessayez." });
    } finally {
      setEssaiEnCours(false);
    }
  }

  return (
    <Depliable titre="Notifications" sousTitre={etat === "actif" ? "✓ Activées sur cet appareil" : undefined} Icone={IconeCloche}>

      {etat === "inconnu" && <p className="text-[#5a6366]">Vérification…</p>}

      {etat === "non-supporte" && (
        <p className="text-[15px] text-[#5a6366]">
          Ce navigateur ne peut pas recevoir de notifications. Utilisez Chrome sur Android, ou Safari sur iPhone (appli ajoutée à l&apos;écran d&apos;accueil).
        </p>
      )}

      {etat === "ios-installer" && (
        <div className="flex flex-col gap-1 rounded-[14px] bg-bg p-3.5 text-[15px] leading-snug">
          <b>Sur iPhone, installez d&apos;abord l&apos;appli</b>
          <span>Les notifications ne marchent que si l&apos;appli est sur l&apos;écran d&apos;accueil (iOS 16.4 ou plus récent).</span>
          <span>1. Touchez le bouton Partager, puis « Sur l&apos;écran d&apos;accueil ».</span>
          <span>2. Ouvrez l&apos;appli depuis la nouvelle icône, puis revenez ici pour activer les notifications.</span>
        </div>
      )}

      {etat === "refuse" && (
        <p className="rounded-[14px] bg-[#fdecea] p-3.5 text-[15px] text-[#b3261e]">
          Les notifications sont bloquées sur cet appareil. Autorisez-les dans les réglages du téléphone ou du navigateur pour ce site, puis rouvrez l&apos;appli.
        </p>
      )}

      {etat === "inactif" && (
        <>
          <p className="text-[15px] text-[#5a6366]">Activez-les pour être prévenu dès qu&apos;une demande arrive, même quand l&apos;appli est fermée.</p>
          <button type="button" onClick={activer} disabled={occupe} className={`${bouton} bg-pri text-white hover:bg-pri-hover`}>
            {occupe ? "Activation…" : "Activer les notifications"}
          </button>
        </>
      )}

      {etat === "actif" && (
        <>
          <p className="font-bold text-pri">✓ Activées sur cet appareil</p>
          <button type="button" onClick={envoyerEssai} disabled={essaiEnCours} className={`${bouton} bg-soft text-pri`}>
            {essaiEnCours ? "Envoi…" : "Envoyer une notification d'essai"}
          </button>
          <button type="button" onClick={desactiver} disabled={occupe} className={`${bouton} bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]`}>
            {occupe ? "…" : "Désactiver sur cet appareil"}
          </button>
        </>
      )}

      {erreur && <p role="alert" className="text-[15px] font-bold text-[#b3261e]">{erreur}</p>}
      {essai && <p role="status" className={`text-[15px] font-bold ${essai.ton === "ok" ? "text-pri" : "text-[#b3261e]"}`}>{essai.texte}</p>}
    </Depliable>
  );
}
