// GET /api/caisse : le tableau de bord de la caisse (PATRON seulement).
// Réponse 200 : { resume: { aujourdhui, mois, enAttente, sept }, duJour: [paiements encaissés aujourd'hui],
//                 enAttente: [tiers payant à recevoir], aEncaisser: { nombre, estime (centimes), liste } }
// En-tête Authorization: Bearer <jeton de connexion>.
import { connection } from "next/server";
import { exigerEquipe } from "@/lib/auth";
import { resumerCaisse } from "@/lib/caisse";
import { jourParis } from "@/lib/paris";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const CHAMPS = "id, mode, amount_cents, status, paid_at, created_at, booking_id, bookings(customer_name, from_label, to_label, pickup_at)";

export async function GET(request) {
  await connection(); // toujours calculé à la demande, jamais préparé à la construction du site
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return Response.json({ erreur: equipe.erreur }, { status: equipe.status, headers: SANS_CACHE });
    if (equipe.role !== "patron") return Response.json({ erreur: "Réservé au patron." }, { status: 403, headers: SANS_CACHE });

    const base = supabaseServeur();
    const maintenant = new Date();
    const depuis = new Date(maintenant.getTime() - 100 * 86_400_000).toISOString();
    const [recents, attente, aEncaisser] = await Promise.all([
      base.from("payments").select(CHAMPS).gte("created_at", depuis).order("created_at", { ascending: false }).limit(1000),
      base.from("payments").select(CHAMPS).eq("status", "pending").order("created_at", { ascending: false }).limit(200),
      base.from("bookings").select("id, customer_name, from_label, to_label, pickup_at, est_price_cents").eq("status", "accepted").lte("pickup_at", maintenant.toISOString()).order("pickup_at", { ascending: false }).limit(100),
    ]);
    const erreurBase = recents.error ?? attente.error ?? aEncaisser.error;
    if (erreurBase) {
      console.error("[api/caisse] lecture impossible :", erreurBase.message);
      return Response.json({ erreur: "Impossible de lire la caisse pour le moment." }, { status: 500, headers: SANS_CACHE });
    }

    const tous = new Map([...recents.data, ...attente.data].map((p) => [p.id, p]));
    const paiements = [...tous.values()];
    const aujourdhui = jourParis(maintenant);
    return Response.json(
      {
        resume: resumerCaisse(paiements, maintenant),
        duJour: paiements.filter((p) => p.status === "paid" && p.paid_at && jourParis(new Date(p.paid_at)) === aujourdhui),
        enAttente: attente.data,
        aEncaisser: {
          nombre: aEncaisser.data.length,
          estime: aEncaisser.data.reduce((s, c) => s + (c.est_price_cents ?? 0), 0),
          liste: aEncaisser.data,
        },
      },
      { headers: SANS_CACHE },
    );
  } catch (e) {
    console.error("[api/caisse] erreur inattendue :", e instanceof Error ? e.message : e);
    return Response.json({ erreur: "Impossible de lire la caisse pour le moment." }, { status: 500, headers: SANS_CACHE });
  }
}
