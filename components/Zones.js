import site from "@/site.config";
import Link from "next/link";
import { slugCommune } from "@/lib/communes";
import { Container, SectionHead } from "./ui";

const L = 560;
const H = 400;
// Projection simple : la carte couvre ~0,38° de longitude sur ~0,22° de latitude autour de la base.
const X = (lon) => ((lon - 2.6) / 0.38) * L;
const Y = (lat) => ((48.12 - lat) / 0.22) * H;

function km(a, b) {
  const t = Math.PI / 180;
  const dLa = (b.lat - a.lat) * t;
  const dLo = (b.lon - a.lon) * t;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * t) * Math.cos(b.lat * t) * Math.sin(dLo / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h)) * 1.25; // x1,25 : la route est plus longue qu'à vol d'oiseau
}

const halo = { stroke: "#fff", strokeWidth: 4, paintOrder: "stroke", strokeLinejoin: "round" };

function Carte() {
  const { base, carte } = site;
  const mx = X(base.lon);
  const my = Y(base.lat);

  return (
    <svg viewBox={`0 0 ${L} ${H}`} role="img" aria-label={`Carte des communes desservies autour de ${base.ville}`} className="block h-auto w-full">
      <rect width={L} height={H} rx="20" fill="#F3F5F3" />
      <path d="M0 300 C 120 270, 200 330, 330 300 S 500 250, 560 280" stroke="#DDE3DE" strokeWidth="10" fill="none" />
      <path d="M220 0 C 210 90, 190 160, 200 230 S 230 340, 240 400" stroke="#CFE0EA" strokeWidth="6" fill="none" />
      <circle cx={mx} cy={my} r="132" fill="var(--soft)" stroke="var(--pri)" strokeWidth="2" strokeDasharray="6 6" />
      {carte.lointaines.map(([nom, x, y]) => (
        <line key={nom} x1={mx} y1={my} x2={x} y2={y} stroke="var(--pri)" strokeWidth="2" strokeDasharray="2 6" strokeLinecap="round" opacity=".7" />
      ))}
      {carte.villes.map((v) => {
        const [dx, dy, ancre] = v.label;
        const x = X(v.lon);
        const y = Y(v.lat);
        return (
          <g key={v.nom}>
            <circle cx={x} cy={y} r="6" fill="#fff" stroke="var(--pri)" strokeWidth="3" />
            <text x={x + dx} y={y + dy} textAnchor={ancre} fontSize="14" fontFamily="var(--font-atkinson), Verdana, sans-serif" fill="#141819" {...halo}>
              {v.nom}
            </text>
          </g>
        );
      })}
      <circle cx={mx} cy={my} r="14" fill="var(--pri)" stroke="#fff" strokeWidth="4" />
      <text x={mx + 20} y={my + 24} fontSize="17" fontWeight="700" fontFamily="var(--font-sora), Arial, sans-serif" fill="#141819" {...halo} strokeWidth="5">
        {base.ville}
      </text>
      {carte.lointaines.map(([nom, x, y]) => {
        const w = nom.length * 9 + 22;
        const bx = Math.min(L - w - 4, Math.max(4, x - w / 2));
        const by = Math.min(H - 34, Math.max(4, y - 15));
        return (
          <g key={nom}>
            <rect x={bx} y={by} width={w} height="30" rx="15" fill="var(--pri)" />
            <text x={bx + w / 2} y={by + 20} textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="var(--font-sora), Arial, sans-serif" fill="#fff">
              {nom}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Zones() {
  const dests = site.destinations.map((d) => {
    const k = Math.round(km(site.base, d));
    return { nom: d.nom, dist: k < 5 ? "en ville" : `≈ ${Math.round(k / 5) * 5} km` };
  });

  return (
    <section id="zones" className="scroll-mt-4 py-16 sm:py-[88px]">
      <Container className="grid items-center gap-9 min-[960px]:grid-cols-[1.25fr_.75fr] min-[960px]:gap-14">
        <div className="min-w-0 rounded-[28px] bg-white p-3">
          <Carte />
        </div>
        <div>
          <SectionHead eyebrow="Zone desservie" title={`Près de chez vous, jusqu'à ${site.carte.rayonKm} km`}>
            <p className="text-[19px] text-[#5a6366]">
              Et partout en France sur réservation. <span className="tbd">Liste des communes à confirmer.</span>
            </p>
          </SectionHead>
          <div className="flex flex-col gap-3">
            {dests.map((d) => (
              <div key={d.nom} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-[18px] py-3.5">
                <b className="text-lg">{d.nom}</b>
                <span className="whitespace-nowrap tabular-nums text-[#5a6366]">{d.dist}</span>
              </div>
            ))}
          </div>
        </div>
      </Container>
      <Container>
        <ul aria-label="Communes desservies" className="mt-9 flex list-none flex-wrap gap-2 p-0">
          {site.communes.map((c) => (
            <li key={c.nom}>
              <Link prefetch={false} href={`/taxi/${slugCommune(c.nom)}`} className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-base text-ink no-underline hover:bg-soft">
                {c.nom}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
