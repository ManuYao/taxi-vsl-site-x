"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import { heureParis, libelleJour } from "@/lib/paris";
import useDansLeNavigateur from "../useDansLeNavigateur";
import Appli from "./Appli";
import CarteCourse from "./CarteCourse";
import Connexion from "./Connexion";
import Planning from "./Planning";
import { IconeAppli, IconeCalendrier, IconeCloche } from "./icones";

const TITRES = { traiter: "À traiter", planning: "Planning", appli: "Appli" };

function Plein({ children }) {
  return <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col items-center justify-center gap-4 px-5 text-center">{children}</main>;
}

// Espace chauffeur : connexion, courses à traiter (Accepter / Refuser), planning, installation.
// La liste se met à jour toute seule dès qu'une demande arrive (temps réel Supabase), avec une relecture
// toutes les 30 secondes et à chaque retour sur l'appli, au cas où le temps réel serait coupé.
export default function AdminApp() {
  const pret = useDansLeNavigateur();
  if (!pret) return <Plein><p className="text-lg text-[#5a6366]">Chargement…</p></Plein>;
  return <Espace />;
}

function Espace() {
  const [session, setSession] = useState(undefined); // undefined : on regarde ; null : pas connecté
  const [fiche, setFiche] = useState(null); // { userId, data } : fiche d'équipe de la personne connectée
  const [courses, setCourses] = useState(null); // { actives, historique }
  const [problemeReseau, setProblemeReseau] = useState(false);
  const [onglet, setOnglet] = useState("traiter");
  const [maintenant, setMaintenant] = useState(() => new Date());
  const [nouvelle, setNouvelle] = useState(null); // bandeau « nouvelle demande »
  const [message, setMessage] = useState(null); // { texte, ton: "ok" | "erreur" }

  const userId = session?.user?.id;
  const ficheDeCeCompte = fiche && fiche.userId === userId ? fiche.data : undefined; // undefined : pas encore lue
  const acces = Boolean(ficheDeCeCompte?.active);

  // Session : lue au démarrage, puis suivie (connexion, déconnexion, renouvellement)
  useEffect(() => {
    const sb = supabaseNavigateur();
    sb.auth.getSession().then(({ data }) => setSession(data.session ?? null));
    const { data: abonnement } = sb.auth.onAuthStateChange((_evenement, s) => setSession(s ?? null));
    return () => abonnement.subscription.unsubscribe();
  }, []);

  // Fiche d'équipe : sans elle (ou inactive), la base refuse de toute façon de montrer les courses
  useEffect(() => {
    if (!userId) return;
    let annule = false;
    supabaseNavigateur()
      .from("staff")
      .select("role, display_name, active")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!annule) setFiche({ userId, data: error ? null : data });
      });
    return () => {
      annule = true;
    };
  }, [userId]);

  const charger = useCallback(async () => {
    const sb = supabaseNavigateur();
    const [actives, anciennes] = await Promise.all([
      sb.from("bookings").select("*").in("status", ["pending", "accepted"]).order("pickup_at", { ascending: true }).limit(200),
      sb.from("bookings").select("*").in("status", ["refused", "cancelled", "done"]).order("pickup_at", { ascending: false }).limit(30),
    ]);
    if (actives.error || anciennes.error) {
      setProblemeReseau(true);
      return;
    }
    setProblemeReseau(false);
    setCourses({ actives: actives.data, historique: anciennes.data });
  }, []);

  // Liste en direct : temps réel + relecture régulière + relecture au retour sur l'appli
  useEffect(() => {
    if (!acces) return;
    const sb = supabaseNavigateur();
    const premiereLecture = setTimeout(charger, 0);
    const canal = sb
      .channel("courses-equipe")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, (evenement) => {
        if (evenement.eventType === "INSERT" && evenement.new?.status === "pending") {
          setNouvelle(evenement.new);
          navigator.vibrate?.(200);
        }
        charger();
      })
      // Une fois abonné, on relit la liste : une demande arrivée pendant la connexion ne doit pas être ratée.
      .subscribe((statut) => {
        if (statut === "SUBSCRIBED") charger();
      });
    const minuteur = setInterval(() => {
      setMaintenant(new Date());
      charger();
    }, 30000);
    const auRetour = () => {
      if (document.visibilityState === "visible") {
        setMaintenant(new Date());
        charger();
      }
    };
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      clearTimeout(premiereLecture);
      sb.removeChannel(canal);
      clearInterval(minuteur);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [acces, charger]);

  // Les messages disparaissent tout seuls
  useEffect(() => {
    if (!message) return;
    const minuteur = setTimeout(() => setMessage(null), 5000);
    return () => clearTimeout(minuteur);
  }, [message]);

  const agir = useCallback(
    async (id, action) => {
      const jeton = (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
      try {
        const reponse = await fetch(`/api/bookings/${id}`, {
          method: "PATCH",
          headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const json = await reponse.json().catch(() => ({}));
        if (reponse.ok) {
          setMessage({ ton: "ok", texte: action === "accepter" ? "Course acceptée. Elle est dans votre planning." : "Course refusée." });
        } else {
          setMessage({ ton: "erreur", texte: json.erreur ?? "Action impossible pour le moment." });
        }
      } catch {
        setMessage({ ton: "erreur", texte: "Pas de connexion. Réessayez dans un instant." });
      }
      await charger(); // dans tous les cas on relit : une autre personne a peut-être déjà pris la course
    },
    [charger],
  );

  if (session === undefined) return <Plein><p className="text-lg text-[#5a6366]">Chargement…</p></Plein>;
  if (session === null) return <Connexion />;
  if (ficheDeCeCompte === undefined) return <Plein><p className="text-lg text-[#5a6366]">Chargement…</p></Plein>;
  if (!acces) {
    return (
      <Plein>
        <h1 className="font-title text-2xl font-extrabold">Accès non autorisé</h1>
        <p className="max-w-[34ch] text-lg text-[#5a6366]">
          Ce compte ({session.user.email}) n&apos;a pas accès à l&apos;espace chauffeur. Demandez au patron de vous ajouter.
        </p>
        <button type="button" onClick={() => supabaseNavigateur().auth.signOut()} className="min-h-[52px] rounded-full bg-pri px-8 font-bold text-white">
          Se déconnecter
        </button>
      </Plein>
    );
  }

  const actives = courses?.actives ?? [];
  const aTraiter = actives.filter((c) => c.status === "pending");
  const planning = actives.filter((c) => c.status === "accepted");

  const onglets = [
    { id: "traiter", libelle: "À traiter", Icone: IconeCloche, nombre: aTraiter.length },
    { id: "planning", libelle: "Planning", Icone: IconeCalendrier },
    { id: "appli", libelle: "Appli", Icone: IconeAppli },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-2">
        <h1 className="font-title text-[26px] font-extrabold leading-tight">{TITRES[onglet]}</h1>
        {onglet === "traiter" && courses && <span className="text-[15px] text-[#5a6366]">{aTraiter.length} à traiter</span>}
      </header>

      {nouvelle && aTraiter.some((c) => c.id === nouvelle.id) && (
        <div role="status" className="mx-4 mb-2 flex items-center gap-3 rounded-2xl bg-dark p-3.5 text-white">
          <div className="min-w-0 flex-1 text-[15px]">
            <b className="block">Nouvelle demande</b>
            <span className="[overflow-wrap:anywhere] text-white/80">
              {nouvelle.customer_name} · {libelleJour(new Date(nouvelle.pickup_at), maintenant)}, {heureParis(new Date(nouvelle.pickup_at))}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setOnglet("traiter");
              setNouvelle(null);
            }}
            className="min-h-11 rounded-full bg-white px-4 text-[15px] font-bold text-dark"
          >
            Voir
          </button>
          <button type="button" aria-label="Fermer" onClick={() => setNouvelle(null)} className="size-11 text-xl text-white/80">
            ×
          </button>
        </div>
      )}

      <main className="flex flex-1 flex-col gap-3 px-4 pb-28">
        {problemeReseau && (
          <p role="alert" className="rounded-2xl bg-[#fdecea] p-3.5 text-[15px] font-bold text-[#b3261e]">
            Impossible de mettre la liste à jour. Vérifiez votre connexion.
          </p>
        )}
        {courses === null && !problemeReseau && <p className="py-10 text-center text-[#5a6366]">Chargement des courses…</p>}

        {onglet === "traiter" && courses && (
          <>
            {aTraiter.length === 0 && (
              <div className="flex flex-col items-center gap-2 rounded-[18px] bg-white px-6 py-10 text-center">
                <IconeCloche className="size-10 text-pri" />
                <p className="font-title text-lg font-bold">Aucune demande pour le moment</p>
                <p className="text-[#5a6366]">Vous serez prévenu dès qu&apos;une demande arrive.</p>
              </div>
            )}
            {aTraiter.map((c) => (
              <CarteCourse key={c.id} course={c} maintenant={maintenant} onAction={agir} />
            ))}
          </>
        )}

        {onglet === "planning" && courses && (
          <Planning planning={planning} historique={courses.historique} maintenant={maintenant} />
        )}

        {onglet === "appli" && (
          <Appli email={session.user.email} role={ficheDeCeCompte.role} nom={ficheDeCeCompte.display_name} />
        )}
      </main>

      {message && (
        <p
          role="status"
          className={`fixed inset-x-4 bottom-24 z-40 mx-auto max-w-[488px] rounded-2xl p-3.5 text-center text-[15px] font-bold text-white shadow-lg ${
            message.ton === "ok" ? "bg-dark" : "bg-[#b3261e]"
          }`}
        >
          {message.texte}
        </p>
      )}

      <nav aria-label="Navigation de l'espace chauffeur" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e2e6e3] bg-white pb-[env(safe-area-inset-bottom,0px)]">
        <div className="mx-auto grid max-w-[520px] grid-cols-3">
          {onglets.map(({ id, libelle, Icone, nombre }) => (
            <button
              key={id}
              type="button"
              aria-current={onglet === id ? "page" : undefined}
              onClick={() => setOnglet(id)}
              className={`relative flex min-h-[64px] flex-col items-center justify-center gap-0.5 text-[13px] font-bold ${onglet === id ? "text-pri" : "text-[#5a6366]"}`}
            >
              <Icone />
              {libelle}
              {nombre > 0 && (
                <span className="absolute top-1.5 left-[calc(50%+6px)] flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#b3261e] px-1 text-[11px] text-white">
                  {nombre}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
