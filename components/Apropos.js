import { Container } from "./ui";
import { CheckIcon } from "./Icons";

function Scene() {
  return (
    <svg viewBox="0 0 600 420" aria-hidden="true" className="block h-auto w-full">
      <rect width="600" height="420" fill="var(--soft)" />
      <circle cx="440" cy="120" r="46" fill="#fff" opacity=".85" />
      <path d="M0 230 C 120 210, 220 222, 300 214 S 480 206, 600 220 L600 420 L0 420 Z" fill="var(--soft2)" />
      <g fill="var(--pri)" opacity=".85">
        <ellipse cx="60" cy="206" rx="10" ry="36" />
        <ellipse cx="90" cy="202" rx="10" ry="40" />
        <ellipse cx="120" cy="206" rx="10" ry="35" />
        <ellipse cx="500" cy="204" rx="10" ry="36" />
        <ellipse cx="530" cy="200" rx="10" ry="40" />
      </g>
      <path d="M0 290 C 160 270, 240 280, 290 266 L 0 420 Z" fill="var(--pri)" opacity=".35" />
      <path d="M330 266 C 380 280, 480 282, 600 300 L600 420 Z" fill="var(--pri)" opacity=".35" />
      <polygon points="292,226 308,226 470,420 130,420" fill="var(--dark)" />
      <g fill="#fff">
        <polygon points="299,236 301,236 302,252 298,252" />
        <polygon points="297,280 303,280 305,306 295,306" />
        <polygon points="294,346 306,346 310,384 290,384" />
      </g>
      <g transform="translate(262 300)">
        <rect x="22" width="32" height="10" rx="3" fill="#fff" />
        <path d="M8 16 Q10 8 20 8 L56 8 Q66 8 68 16 L72 30 L4 30 Z" fill="var(--dark)" stroke="#fff" strokeOpacity=".2" />
        <rect x="14" y="12" width="48" height="10" rx="2" fill="#B9CBD4" />
        <rect y="28" width="76" height="22" rx="5" fill="var(--dark)" stroke="#fff" strokeOpacity=".2" />
        <rect x="6" y="34" width="12" height="6" rx="2" fill="#D9473A" />
        <rect x="58" y="34" width="12" height="6" rx="2" fill="#D9473A" />
      </g>
    </svg>
  );
}

export default function Apropos() {
  return (
    <section id="nous" className="scroll-mt-4 pb-16 sm:pb-[88px]">
      <Container className="grid items-center gap-9 min-[900px]:grid-cols-2 min-[900px]:gap-16">
        <div data-rv="gauche" className="overflow-hidden rounded-[28px] bg-soft">
          <Scene />
        </div>
        <div data-rv="droite" className="flex min-w-0 flex-col gap-4">
          <span className="text-sm font-bold uppercase tracking-[.1em] text-pri">Qui sommes-nous</span>
          <h2 className="text-[clamp(30px,4.4vw,46px)] font-extrabold leading-[1.06] tracking-tight text-balance">
            Une entreprise d&apos;ici<span className="tbd align-middle font-body text-xs font-bold uppercase tracking-wide">Texte à venir</span>
          </h2>
          <p className="tbd max-w-[52ch] self-start text-[#5a6366]">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
          </p>
          <div className="flex flex-wrap gap-2.5">
            {[["Ponctuel"], ["Aide à la montée"], ["Véhicule", "à préciser"]].map(([t, tbd]) => (
              <span key={t} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-base">
                <CheckIcon className="size-[18px] text-pri" />
                {t} {tbd && <span className="tbd">{tbd}</span>}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
