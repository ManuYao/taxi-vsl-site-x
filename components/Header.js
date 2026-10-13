import site from "@/site.config";
import { PhoneIcon } from "./Icons";

const liens = [
  ["#reserver", "Réserver"],
  ["#services", "Services"],
  ["#cpam", "Conventionné"],
  ["#zones", "Zones"],
  ["#faq", "Questions"],
];

export default function Header() {
  return (
    <header className="bg-white">
      <div className="mx-auto flex max-w-[1160px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3 text-ink no-underline">
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-pri">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="size-7">
              <path d="M6 21h20M8 21l2-7h12l2 7M9 21v3M23 21v3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="12" y="8" width="8" height="4" rx="1.2" fill="#fff" />
            </svg>
          </span>
          <span>
            <b className="tbd block font-title text-[19px] leading-tight">{site.nom}</b>
            <small className="text-sm text-[#5a6366]">
              Taxi · VSL · <span className="tbd">{site.infos.zoneCourte}</span>
            </small>
          </span>
        </a>

        <nav aria-label="Menu" className="hidden gap-7 text-base min-[980px]:flex">
          {liens.map(([href, texte]) => (
            <a key={href} href={href} className="text-ink no-underline hover:text-pri">
              {texte}
            </a>
          ))}
        </nav>

        <a
          href={`tel:${site.telephone.lien}`}
          aria-label={`Appeler le ${site.telephone.affiche}`}
          className="inline-flex items-center gap-2.5 whitespace-nowrap rounded-full bg-soft p-1 font-bold tabular-nums text-dark no-underline sm:py-2 sm:pr-[18px] sm:pl-2"
        >
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-pri">
            <PhoneIcon className="size-[18px] text-white" />
          </span>
          <span className="hidden sm:inline">{site.telephone.affiche}</span>
        </a>
      </div>
    </header>
  );
}
