import site from "@/site.config";
import { Container, SectionHead } from "./ui";

const Voiturette = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <rect x="6" y="-20" width="70" height="20" rx="8" fill="var(--dark)" />
    <path d="M18 -20 L28 -34 L56 -34 L66 -20 Z" fill="var(--dark)" />
    <rect x="34" y="-40" width="16" height="6" rx="2" fill="#fff" />
    <circle cx="22" cy="0" r="8" fill="#16191A" />
    <circle cx="62" cy="0" r="8" fill="#16191A" />
  </g>
);

function Local() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true" className="block aspect-[16/10] h-auto w-full">
      <rect width="320" height="200" fill="var(--soft)" />
      <circle cx="250" cy="52" r="20" fill="#fff" opacity=".8" />
      <rect y="150" width="320" height="50" fill="var(--soft2)" />
      <rect x="40" y="96" width="56" height="54" fill="#fff" />
      <polygon points="34,98 68,70 102,98" fill="var(--pri)" />
      <rect x="60" y="122" width="16" height="28" fill="var(--soft2)" />
      <rect x="120" y="70" width="34" height="80" fill="#fff" />
      <polygon points="116,72 137,30 158,72" fill="var(--dark)" />
      <circle cx="137" cy="92" r="7" fill="var(--soft2)" />
      <rect x="176" y="104" width="62" height="46" fill="#fff" />
      <polygon points="170,106 207,80 244,106" fill="var(--pri)" />
      <rect x="186" y="116" width="14" height="12" fill="var(--soft2)" />
      <rect x="214" y="116" width="14" height="12" fill="var(--soft2)" />
      <Voiturette x={200} y={150} />
    </svg>
  );
}

function Medical() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true" className="block aspect-[16/10] h-auto w-full">
      <rect width="320" height="200" fill="var(--soft)" />
      <rect y="160" width="320" height="40" fill="var(--soft2)" />
      <rect x="70" y="50" width="180" height="110" rx="6" fill="#fff" />
      <g fill="var(--soft2)">
        <rect x="88" y="70" width="22" height="18" rx="3" />
        <rect x="88" y="100" width="22" height="18" rx="3" />
        <rect x="210" y="70" width="22" height="18" rx="3" />
        <rect x="210" y="100" width="22" height="18" rx="3" />
      </g>
      <rect x="140" y="64" width="40" height="40" rx="10" fill="var(--pri)" />
      <path d="M160 72 V96 M148 84 H172" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
      <rect x="140" y="122" width="40" height="38" fill="var(--soft2)" />
      <Voiturette x={26} y={160} s={1.1} />
    </svg>
  );
}

function Gares() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true" className="block aspect-[16/10] h-auto w-full">
      <rect width="320" height="200" fill="var(--soft)" />
      <path d="M40 60 Q120 20 210 44" stroke="#fff" strokeWidth="3" strokeDasharray="6 8" fill="none" />
      <g transform="translate(222 46) rotate(12)">
        <path d="M-30 0 L30 0 L40 -4 L30 -8 L-26 -6 Z" fill="var(--dark)" />
        <path d="M-4 -6 L10 -26 L18 -26 L12 -6 Z M-4 0 L10 18 L18 18 L12 0 Z" fill="var(--pri)" />
        <path d="M-26 -6 L-34 -18 L-28 -18 L-18 -6 Z" fill="var(--pri)" />
      </g>
      <rect y="168" width="320" height="32" fill="var(--soft2)" />
      <rect y="164" width="320" height="4" fill="var(--dark)" opacity=".5" />
      <g transform="translate(30 112)">
        <rect width="250" height="48" rx="14" fill="#fff" />
        <rect y="34" width="250" height="8" fill="var(--pri)" />
        <g fill="var(--soft2)">
          {[18, 64, 110, 156, 202].map((x) => (
            <rect key={x} x={x} y="10" width="34" height="18" rx="4" />
          ))}
        </g>
      </g>
      <circle cx="70" cy="164" r="6" fill="var(--dark)" />
      <circle cx="240" cy="164" r="6" fill="var(--dark)" />
    </svg>
  );
}

function Longue() {
  return (
    <svg viewBox="0 0 320 200" aria-hidden="true" className="block aspect-[16/10] h-auto w-full">
      <rect width="320" height="200" fill="var(--soft)" />
      <polygon points="0,110 60,70 110,104 170,60 240,108 290,84 320,100 320,200 0,200" fill="var(--soft2)" />
      <rect y="108" width="320" height="92" fill="#fff" opacity=".55" />
      <polygon points="150,108 170,108 250,200 70,200" fill="var(--dark)" />
      <g fill="#fff">
        <rect x="158" y="116" width="4" height="10" />
        <rect x="157" y="138" width="6" height="14" />
        <rect x="156" y="166" width="8" height="20" />
      </g>
      <rect x="244" y="88" width="6" height="64" fill="var(--dark)" />
      <rect x="222" y="76" width="74" height="26" rx="6" fill="var(--pri)" />
      <text x="259" y="94" textAnchor="middle" fontFamily="var(--font-sora), Arial, sans-serif" fontWeight="700" fontSize="13" fill="#fff">Paris</text>
    </svg>
  );
}

export default function Services() {
  const services = [
    { Dessin: Local, titre: "Taxi local", texte: `Courses dans ${site.base.ville} et l'agglo.` },
    { Dessin: Medical, titre: "Médical et VSL", texte: "Hôpital, dialyse, rééducation." },
    { Dessin: Gares, titre: "Gares et aéroports", texte: `${site.base.ville}, Orly, Roissy-CDG.` },
    { Dessin: Longue, titre: "Longue distance", texte: "Toute la France, arrêts possibles." },
  ];

  return (
    <section id="services" className="scroll-mt-4 py-16 sm:py-[88px]">
      <Container>
        <SectionHead eyebrow="Services" title="Où que vous alliez" center />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5">
          {services.map(({ Dessin, titre, texte }) => (
            <article key={titre} className="flex min-w-0 flex-col overflow-hidden rounded-3xl bg-white transition hover:-translate-y-1 hover:shadow-[0_24px_40px_-28px_rgba(15,25,20,.55)]">
              <Dessin />
              <div className="flex flex-col gap-1.5 px-[22px] pt-5 pb-6">
                <h3 className="text-[22px] font-bold">{titre}</h3>
                <p className="text-[17px] text-[#5a6366]">{texte}</p>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
