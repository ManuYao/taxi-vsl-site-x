// POST /api/push/test : envoie une notification d'essai aux appareils DE LA PERSONNE connectée (pas à l'équipe).
// Réservé à l'équipe : en-tête Authorization: Bearer <jeton de connexion>. Pas de corps.
// Réponse 200 : { ok: true, envoyes } ou { ok: false, raison } si aucun appareil n'a reçu le message.
import { exigerEquipe } from "@/lib/auth";
import { creerLimiteur, ipDuClient } from "@/lib/http";
import { envoyerPush } from "@/lib/push";

const SANS_CACHE = { "Cache-Control": "no-store" };
const limiteur = creerLimiteur({ max: 10, fenetreMs: 10 * 60_000 });

export async function POST(request) {
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return Response.json({ erreur: equipe.erreur }, { status: equipe.status, headers: SANS_CACHE });

    const attente = limiteur(equipe.user.id);
    if (attente) {
      return Response.json({ erreur: "Trop d'essais. Réessayez dans quelques minutes." }, { status: 429, headers: { ...SANS_CACHE, "Retry-After": String(attente) } });
    }

    const r = await envoyerPush(
      { titre: "Notification d'essai", texte: "Tout fonctionne : vous serez prévenu ici à chaque nouvelle course.", url: "/admin", tag: "essai" },
      { pour: equipe.user.id },
    );
    return Response.json(r.ok ? { ok: true, envoyes: r.envoyes } : { ok: false, raison: r.raison ?? "aucun appareil" }, { headers: SANS_CACHE });
  } catch (e) {
    console.error("[api/push/test] erreur inattendue :", e instanceof Error ? e.message : e);
    return Response.json({ erreur: "Essai impossible pour le moment." }, { status: 500, headers: SANS_CACHE });
  }
}
