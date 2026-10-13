import { dureeLisible } from "@/lib/dates";

// Bloc « Prix estimé » : visible avant l'envoi, avec la mention obligatoire.
export default function PrixEstime({ statut, resultat, conventionne, messageVide, codeSaisi }) {
  const ok = statut === "ok";
  const promo = ok ? resultat.promo : null;
  return (
    <div
      aria-live="polite"
      className={`flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-[18px] px-5 py-[18px] ${
        ok ? "bg-soft" : "bg-bg shadow-[inset_0_0_0_1.5px_#e2e6e3]"
      }`}
    >
      <div className="flex min-w-0 flex-col">
        <small className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-pri">
          Prix estimé
          {promo && <span className="rounded-full bg-pri px-2.5 py-0.5 text-[13px] text-white">Promo −{promo.pourcent} %</span>}
        </small>
        <span className="flex flex-wrap items-baseline gap-x-3">
          <b className="font-title text-[44px] leading-none tabular-nums">{ok ? `≈ ${resultat.prix} €` : "—"}</b>
          {promo && resultat.prixAvant != null && (
            <s className="text-xl tabular-nums text-[#5a6366]">
              {resultat.prixAvant} €<span className="sr-only"> avant la remise</span>
            </s>
          )}
        </span>
        {promo && <span className="text-[15px] font-bold text-pri">{promo.nom}</span>}
      </div>

      <div className="flex flex-col gap-0.5 text-[15px] tabular-nums text-[#5a6366] sm:text-right">
        {statut === "vide" && (
          <span>{messageVide ?? "Indiquez le départ et l'arrivée en choisissant une adresse de la liste."}</span>
        )}
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
        {ok && codeSaisi && resultat.codeInvalide && (
          <span role="status" className="font-bold text-[#b3261e]">Ce code n&apos;est pas valable pour cette course.</span>
        )}
        <span>Estimation. Le taximètre fait foi.</span>
        {ok && !resultat.tarifsConfirmes && <span className="tbd self-start sm:self-end">Tarifs fictifs, à confirmer</span>}
      </div>

      {conventionne && <span className="w-full text-[15px] font-bold text-pri">Pris en charge selon votre prescription médicale.</span>}
    </div>
  );
}
