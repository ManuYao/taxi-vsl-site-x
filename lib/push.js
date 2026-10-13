import "server-only";
import webpush from "web-push";
import { supabaseServeur } from "./supabase";
import { envoyerVersAbonnements } from "./push-core";

// Notification push vers les téléphones de l'équipe (membres ACTIFS de la table « staff » seulement).
// payload : { titre, texte, url?, tag? }, par exemple
//   { titre: "Nouvelle course", texte: "Mme Martin · demain 10 h · Montargis → Orly", url: "/admin", tag: "course-<id>" }
// Les clés viennent de .env.local : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto: ou https:).
// Ne lève jamais d'erreur : renvoie { ok, envoyes, echecs?, raison? } pour que l'enregistrement d'une course n'échoue pas.
// Les abonnements que le navigateur refuse (404/410 : appli désinstallée, permission retirée) sont supprimés de la base.

// options.pour : identifiant d'un compte ; seuls SES appareils reçoivent le message (bouton « Envoyer un test »)
export async function envoyerPush(payload, { pour } = {}) {
  try {
    const sujet = process.env.VAPID_SUBJECT;
    const clePublique = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const clePrivee = process.env.VAPID_PRIVATE_KEY;
    if (!sujet || !clePublique || !clePrivee) return { ok: false, envoyes: 0, raison: "non configuré" };
    try {
      webpush.setVapidDetails(sujet, clePublique, clePrivee);
    } catch (e) {
      // Les messages de web-push ne contiennent jamais les clés ; on garde la trace pour corriger .env.local
      console.error("[push] clés VAPID invalides :", e instanceof Error ? e.message : e);
      return { ok: false, envoyes: 0, raison: "clés VAPID invalides" };
    }

    let base;
    try {
      base = supabaseServeur();
    } catch {
      return { ok: false, envoyes: 0, raison: "base non configurée" };
    }

    // Les appareils des membres actifs de l'équipe (un compte désactivé ne reçoit plus rien)
    const { data: equipe, error: erreurEquipe } = await base.from("staff").select("user_id").eq("active", true);
    if (erreurEquipe) {
      console.error("[push] lecture de l'équipe impossible :", erreurEquipe.message);
      return { ok: false, envoyes: 0, raison: "lecture de l'équipe impossible" };
    }
    const ids = (equipe ?? []).map((m) => m.user_id).filter((id) => !pour || id === pour);
    if (!ids.length) return { ok: false, envoyes: 0, raison: "aucun appareil" };

    const { data: abonnements, error: erreurAbos } = await base
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", ids);
    if (erreurAbos) {
      console.error("[push] lecture des appareils impossible :", erreurAbos.message);
      return { ok: false, envoyes: 0, raison: "lecture des appareils impossible" };
    }

    if (!abonnements?.length) return { ok: false, envoyes: 0, raison: "aucun appareil" };

    const r = await envoyerVersAbonnements({ webpush, abonnements, payload });

    if (r.expires.length) {
      const { error } = await base.from("push_subscriptions").delete().in("endpoint", r.expires);
      if (error) console.error("[push] suppression des appareils expirés impossible :", error.message);
    }
    if (r.echecs) console.warn(`[push] ${r.echecs} envoi(s) en échec :`, JSON.stringify(r.raisons));

    if (r.ok) return { ok: true, envoyes: r.envoyes, echecs: r.echecs };
    const raison = r.raison ?? (r.echecs ? Object.keys(r.raisons).join(", ") : "aucun appareil");
    return { ok: false, envoyes: 0, echecs: r.echecs, raison };
  } catch (e) {
    console.error("[push] erreur inattendue :", e instanceof Error ? e.message : e);
    return { ok: false, envoyes: 0, raison: "erreur inattendue" };
  }
}
