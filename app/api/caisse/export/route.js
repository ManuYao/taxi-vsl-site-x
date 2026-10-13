// GET /api/caisse/export?mois=2026-10 : export CSV du mois pour le comptable (PATRON seulement).
// Un paiement encaissé compte dans le mois de son encaissement ; un tiers payant encore à recevoir, dans le mois où il a été saisi.
// En-tête Authorization: Bearer <jeton de connexion>. Réponse : fichier CSV (séparateur « ; », accents lisibles dans Excel).
import { connection } from "next/server";
import { exigerEquipe } from "@/lib/auth";
import { MODES, centimesEnTexte, construireCsv } from "@/lib/caisse";
import { dateLisibleParis, jourParis } from "@/lib/paris";
import { supabaseServeur } from "@/lib/supabase";

const SANS_CACHE = { "Cache-Control": "no-store" };
const erreur = (message, status) => Response.json({ erreur: message }, { status, headers: SANS_CACHE });

export async function GET(request) {
  await connection(); // toujours calculé à la demande, jamais préparé à la construction du site
  try {
    const equipe = await exigerEquipe(request);
    if (!equipe.ok) return erreur(equipe.erreur, equipe.status);
    if (equipe.role !== "patron") return erreur("Réservé au patron.", 403);

    const mois = new URL(request.url).searchParams.get("mois") ?? "";
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mois)) return erreur("Mois invalide. Exemple : 2026-10.", 400);

    // On lit large (le mois entier plus une marge pour les fuseaux), puis on filtre exactement sur les jours de Paris.
    const [a, m] = mois.split("-").map(Number);
    const debut = new Date(Date.UTC(a, m - 1, 1) - 86_400_000).toISOString();
    const fin = new Date(Date.UTC(a, m, 1) + 86_400_000).toISOString();
    const { data, error } = await supabaseServeur()
      .from("payments")
      .select("mode, amount_cents, status, paid_at, created_at, bookings(customer_name, from_label, to_label, pickup_at)")
      .or(`and(paid_at.gte.${debut},paid_at.lt.${fin}),and(status.eq.pending,created_at.gte.${debut},created_at.lt.${fin})`)
      .order("created_at", { ascending: true })
      .limit(5000);
    if (error) {
      console.error("[api/caisse/export] lecture impossible :", error.message);
      return erreur("Impossible de préparer l'export pour le moment.", 500);
    }

    const dansLeMois = data.filter((p) => jourParis(new Date(p.status === "paid" ? p.paid_at : p.created_at)).slice(0, 7) === mois);
    const lignes = dansLeMois.map((p) => [
      jourParis(new Date(p.status === "paid" ? p.paid_at : p.created_at)).split("-").reverse().join("/"),
      p.bookings?.customer_name ?? "",
      p.bookings ? `${p.bookings.from_label} → ${p.bookings.to_label}` : "",
      p.bookings?.pickup_at ? dateLisibleParis(new Date(p.bookings.pickup_at)) : "",
      MODES[p.mode] ?? p.mode,
      centimesEnTexte(p.amount_cents),
      p.status === "paid" ? "Encaissé" : "À recevoir (tiers payant)",
    ]);
    const encaisse = dansLeMois.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);
    const aRecevoir = dansLeMois.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
    lignes.push([], ["TOTAL encaissé", "", "", "", "", centimesEnTexte(encaisse), ""], ["TOTAL à recevoir", "", "", "", "", centimesEnTexte(aRecevoir), ""]);

    const csv = construireCsv(["Date", "Client", "Trajet", "Course du", "Mode de paiement", "Montant (€)", "Statut"], lignes);
    return new Response(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="caisse-${mois}.csv"`, ...SANS_CACHE },
    });
  } catch (e) {
    console.error("[api/caisse/export] erreur inattendue :", e instanceof Error ? e.message : e);
    return erreur("Impossible de préparer l'export pour le moment.", 500);
  }
}
