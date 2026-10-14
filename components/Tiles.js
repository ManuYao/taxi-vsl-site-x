import site from "@/site.config";
import { PhoneIcon, ClockIcon, PinIcon, CardIcon } from "./Icons";

export default function Tiles() {
  const tuiles = [
    { Icon: PhoneIcon, titre: "Téléphone et WhatsApp", texte: site.telephone.affiche, fort: true },
    { Icon: ClockIcon, titre: "Horaires", texte: site.infos.horaires, tbd: true },
    { Icon: PinIcon, titre: "Zone", texte: site.infos.zone, tbd: true },
    { Icon: CardIcon, titre: "Paiement", texte: site.infos.paiement, tbd: true },
  ];

  return (
    <div className="mx-auto max-w-[1160px] px-4 sm:px-8">
      <div className="relative -mt-7 grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
        {tuiles.map(({ Icon, titre, texte, fort, tbd }) => (
          <div
            key={titre}
            className={`carte-fx flex min-w-0 flex-col gap-1.5 rounded-[18px] p-5 shadow-[0_14px_34px_-24px_rgba(15,25,20,.5)] ${
              fort ? "bg-pri text-white" : "bg-white"
            }`}
          >
            <div className={`mb-1.5 flex size-10 items-center justify-center rounded-xl ${fort ? "bg-white/15" : "bg-soft"}`}>
              <Icon className={`size-[22px] ${fort ? "text-white" : "text-pri"}`} />
            </div>
            <b className="text-[17px]">{titre}</b>
            <span
              className={`tabular-nums ${tbd ? "tbd self-start" : ""} ${
                fort ? "font-title text-[22px] font-bold" : "text-base text-[#5a6366]"
              }`}
            >
              {texte}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
