import site from "@/site.config";
import { Container } from "./ui";

export default function Footer() {
  return (
    <footer className="bg-white py-10">
      <Container className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4">
        <a href="#top" className="flex min-w-0 items-center gap-3 text-ink no-underline">
          <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-pri">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className="size-7">
              <path d="M6 21h20M8 21l2-7h12l2 7M9 21v3M23 21v3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="12" y="8" width="8" height="4" rx="1.2" fill="#fff" />
            </svg>
          </span>
          <span>
            <b className="tbd block font-title text-[19px] leading-tight">{site.nom}</b>
            <small className="text-sm tabular-nums text-[#5a6366]">{site.telephone.affiche}</small>
          </span>
        </a>
        <nav aria-label="Pied de page" className="flex flex-wrap gap-x-[22px] gap-y-2 text-[15px]">
          {[["#services", "Services"], ["#cpam", "Conventionné"], ["#zones", "Zones"], ["#top", "Mentions légales"], ["#top", "Confidentialité"]].map(([href, t]) => (
            <a key={t} href={href} className="text-[#5a6366]">
              {t}
            </a>
          ))}
        </nav>
        <p className="tbd w-full text-sm text-[#5a6366]">Version de démonstration. Contenus, tarifs et illustrations provisoires.</p>
      </Container>
    </footer>
  );
}
