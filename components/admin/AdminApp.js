"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseNavigateur } from "@/lib/supabase-browser";
import { etatEffectif } from "@/lib/disponibilite";
import { heureParis, libelleJour } from "@/lib/paris";
import useDansLeNavigateur from "../useDansLeNavigateur";
import Appli from "./Appli";
import BlocNotifications from "./BlocNotifications";
import ChoisirMotDePasse from "./ChoisirMotDePasse";
import CarteCourse from "./CarteCourse";
import Connexion from "./Connexion";
import Disponibilite from "./Disponibilite";
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
  const [dispo, setDispo] = useState(null); // ligne « availability » (null : pas lue, ou table absente)
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
    const { data: abonnement } = sb.auth.onAuthStateChange((evenement, s) => {
      if (evenement === "SIGNED_OUT") {
        // Déconnexion : rien ne doit rester de la personne précédente (onglet, courses, messages)
        setOnglet("traiter");
        setCourses(null);
        setDispo(null);
        setFiche(null);
        setNouvelle(null);
        setMessage(null);
      }
      setSession(s ?? null);
    });
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
    const [actives, anciennes, disponibilite] = await Promise.all([
      sb.from("bookings").select("*").in("status", ["pending", "accepted"]).order("pickup_at", { ascending: true }).limit(200),
      sb.from("bookings").select("*").in("status", ["refused", "cancelled", "done"]).order("pickup_at", { ascending: false }).limit(30),
      sb.from("availability").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (actives.error || anciennes.error) {
      setProblemeReseau(true);
      return;
    }
    setProblemeReseau(false);
    setCourses({ actives: actives.data, historique: anciennes.data });
    setDispo(disponibilite.error ? null : disponibilite.data); // sans la table (migration pas encore lancée) : en ligne
  }, []);

  // Change l'état du service (en ligne / hors ligne / vacances) : le serveur vérifie, enregistre et prévient l'équipe
  const changerDispo = useCallback(
    async (valeurs) => {
      const jeton = (await supabaseNavigateur().auth.getSession()).data.session?.access_token;
      try {
        const reponse = await fetch("/api/disponibilite", {
          method: "PATCH",
          headers: { Authorization: `Bearer ${jeton}`, "Content-Type": "application/json" },
          body: JSON.stringify(valeurs),
        });
        const json = await reponse.json().catch(() => ({}));
        setMessage(
          reponse.ok
            ? { ton: "ok", texte: json.ouvert ? "Réservations en ligne ouvertes." : "Réservations en ligne fermées." }
            : { ton: "erreur", texte: json.erreur ?? "Changement impossible pour le moment." },
        );
      } catch {
        setMessage({ ton: "erreur", texte: "Pas de connexion. Réessayez dans un instant." });
      }
      await charger();
    },
    [charger],
  );

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

  // Un toucher sur une notification, appli déjà ouverte : le service worker nous prévient, on montre les courses à traiter
  useEffect(() => {
    if (!acces || !("serviceWorker" in navigator)) return;
    const auClic = (evenement) => {
      if (evenement.data?.type === "notification-clic") setOnglet("traiter");
    };
    navigator.serviceWorker.addEventListener("message", auClic);
    return () => navigator.serviceWorker.removeEventListener("message", auClic);
  }, [acces]);

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
          const textes = { accepter: "Course acceptée. Elle est dans votre planning.", refuser: "Course refusée.", annuler: "Course annulée." };
          setMessage({ ton: "ok", texte: textes[action] });
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

  // Premier accès avec le mot de passe provisoire donné par le patron : on doit d'abord choisir le sien
  if (session.user.user_metadata?.doit_changer_mdp) {
    return <ChoisirMotDePasse obligatoire email={session.user.email} />;
  }

  const actives = courses?.actives ?? [];
  const aTraiter = actives.filter((c) => c.status === "pending");
  const planning = actives.filter((c) => c.status === "accepted");
  const etatDuService = etatEffectif(dispo); // ce qui est réellement en vigueur aujourd'hui

  const onglets = [
    { id: "traiter", libelle: "À traiter", Icone: IconeCloche, nombre: aTraiter.length },
    { id: "planning", libelle: "Planning", Icone: IconeCalendrier },
    { id: "appli", libelle: "Appli", Icone: IconeAppli },
  ];

  return (
    <div className="mx-auto flex min-h-dvh max-w-[520px] flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-5 pb-2">
        <h1 className="font-title text-[26px] font-extrabold leading-tight">{TITRES[onglet]}</h1>
        {onglet === "traiter" && courses && (
          // Un appui ouvre ou ferme les réservations en ligne (en vacances : mène aux réglages de la disponibilité)
          <button
            type="button"
            onClick={() => (etatDuService.etat === "vacances" ? setOnglet("appli") : changerDispo({ state: etatDuService.ouvert ? "offline" : "online", message: "" }))}
            aria-label={etatDuService.ouvert ? "Réservations en ligne ouvertes : appuyer pour les fermer" : "Réservations en ligne fermées : appuyer pour les ouvrir"}
            className={`inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-3.5 text-[14px] font-bold shadow-[inset_0_0_0_1.5px_#e2e6e3] ${etatDuService.ouvert ? "text-pri" : "text-[#b3261e]"}`}
          >
            <span aria-hidden="true">{etatDuService.ouvert ? "🟢" : "🔴"}</span>
            {etatDuService.etat === "online" ? "En ligne" : etatDuService.etat === "offline" ? "Hors ligne" : "Vacances"}
          </button>
        )}
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
          <Planning planning={planning} historique={courses.historique} maintenant={maintenant} onAction={agir} userId={userId} role={ficheDeCeCompte.role} />
        )}

        {onglet === "appli" && (
          <Appli email={session.user.email} role={ficheDeCeCompte.role} nom={ficheDeCeCompte.display_name}>
            <Disponibilite key={dispo?.updated_at ?? "aucune"} dispo={dispo} onEnregistrer={changerDispo} />
            <BlocNotifications />
          </Appli>
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
