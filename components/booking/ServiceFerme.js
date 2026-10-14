import site from "@/site.config";
import { ChatIcon, PhoneIcon } from "../Icons";

// « De retour le » = le lendemain du dernier jour de vacances : "2026-10-27" -> "Mercredi 28 octobre"
function lendemain(jour) {
  const [a, m, j] = jour.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, j + 1));
  const texte = d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

// Remplace le formulaire quand les réservations en ligne sont fermées (hors ligne ou vacances).
// Le téléphone reste toujours en évidence : on peut encore joindre le chauffeur.
export default function ServiceFerme({ info }) {
  const vacances = info?.etat === "vacances";
  return (
    <div role="status" className="flex flex-col gap-4 rounded-3xl bg-white p-6 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] sm:p-8">
      <h3 className="font-title text-[28px] font-extrabold leading-tight">
        {vacances ? "Nous sommes en vacances" : "Réservation en ligne fermée"}
      </h3>
      {vacances && info.jusquau && <p className="text-lg">De retour : <b>{lendemain(info.jusquau)}</b></p>}
      {info?.message && <p className="rounded-2xl bg-soft px-4 py-3 text-lg [overflow-wrap:anywhere]">{info.message}</p>}
      <p className="text-lg text-[#5a6366]">
        {vacances ? "Pour une urgence ou une question, vous pouvez toujours nous appeler." : "Vous pouvez nous appeler : on réserve pour vous."}
      </p>
      <div className="flex flex-wrap gap-3">
        <a href={`tel:${site.telephone.lien}`} className="fx fx-pri inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-full bg-pri px-[26px] text-[19px] font-bold text-white no-underline hover:bg-pri-hover">
          <PhoneIcon className="size-[22px]" />
          {site.telephone.affiche}
        </a>
        <a href={`https://wa.me/${site.whatsapp}`} className="fx fx-contour inline-flex min-h-[58px] items-center justify-center gap-2.5 rounded-full border-2 border-ink px-[26px] text-[19px] font-bold text-ink no-underline hover:bg-soft">
          <ChatIcon className="size-[22px]" />
          WhatsApp
        </a>
      </div>
    </div>
  );
}

