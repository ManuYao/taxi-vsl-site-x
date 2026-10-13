import site from "@/site.config";
import { dureeLisible } from "@/lib/dates";

// Bloc « Prix estimé » : visible avant l'envoi, avec la mention obligatoire.
export default function PrixEstime({ statut, resultat, conventionne }) {
  const ok = statut === "ok";
  return (
    <div
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[18px] px-5 py-[18px] ${
        ok ? "bg-soft" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"
      }`}
    >
      <div className="flex min-w-0 flex-col">
        <small className="text-[15px] font-bold text-pri">Prix estimé</small>
        <b className="font-title text-[44px] leading-none tabular-nums">{ok ? `≈ ${resultat.prix} €` : "—"}</b>
      </div>

      <div className="flex flex-col gap-0.5 text-[15px] tabular-nums text-[#5a6366] sm:text-right">
        {statut === "vide" && <span>Indiquez le départ et l&apos;arrivée en choisissant une adresse de la liste.</span>}
        {statut === "calcul" && <span>Calcul en cours…</span>}
        {statut === "erreur" && <span>Prix indisponible pour le moment. Le chauffeur vous le confirmera.</span>}
        {ok && (
          <>
            <span>
              {resultat.km} km · environ {dureeLisible(resultat.minutes)}
            </span>
            <span>
              {resultat.tarif === "nuit" ? "Tarif de nuit ou dimanche" : "Tarif de jour"}
              {resultat.arret ? " · avec arrêt" : ""}
            </span>
          </>
        )}
        <span>Estimation. Le taximètre fait foi.</span>
        {!site.tarifs.confirmes && <span className="tbd self-start sm:self-end">Tarifs fictifs, à confirmer</span>}
      </div>

      {conventionne && <span className="w-full text-[15px] font-bold text-pri">Pris en charge selon votre prescription médicale.</span>}
    </div>
  );
}
