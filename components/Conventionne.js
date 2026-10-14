import { Container, SectionHead } from "./ui";

const svg = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const etapes = [
  {
    titre: "Le médecin prescrit",
    texte: "Il vous remet un bon de transport.",
    icone: (
      <svg {...svg} strokeWidth="1.8" className="size-[52px] text-pri">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6M12 12v6M9 15h6" />
      </svg>
    ),
  },
  {
    titre: "Vous réservez",
    texte: "Par téléphone ou en ligne.",
    icone: (
      <svg {...svg} strokeWidth="1.8" className="size-[52px] text-pri">
        <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
      </svg>
    ),
  },
  {
    titre: "On vous conduit",
    texte: "Selon votre prise en charge, sans avance de frais.",
    tbd: true,
    icone: (
      <svg {...svg} strokeWidth="1.8" className="size-[52px] text-pri">
        <path d="M5 17h14M6 17l1.5-6h9L18 17M7 17v2M17 17v2M10 11l1-3h2l1 3" />
      </svg>
    ),
  },
];

export default function Conventionne() {
  return (
    <section id="cpam" className="scroll-mt-4 bg-white/80 py-16 sm:py-[88px]">
      <Container>
        <SectionHead eyebrow="Transport conventionné" title="Un transport prescrit ? C'est simple" center />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6">
          {etapes.map((e, i) => (
            <div key={e.titre} className="reveal flex flex-col items-center gap-3.5 text-center">
              <div className="relative flex size-28 items-center justify-center rounded-full bg-soft">
                <span className="absolute top-0 right-0 flex size-[34px] items-center justify-center rounded-full bg-pri font-title text-base font-extrabold text-white">
                  {i + 1}
                </span>
                {e.icone}
              </div>
              <b className="text-xl">{e.titre}</b>
              <span className={`max-w-[26ch] text-[#5a6366] ${e.tbd ? "tbd" : ""}`}>{e.texte}</span>
            </div>
          ))}
        </div>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-[#5a6366]">À prendre avec vous :</span>
          {["Carte Vitale", "Prescription"].map((c) => (
            <span key={c} className="inline-flex items-center gap-2 rounded-full bg-bg px-4 py-2 text-base">
              <svg {...svg} strokeWidth="2" className="size-[18px] text-pri">
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <path d="M6 10h5M6 14h8" />
              </svg>
              {c}
            </span>
          ))}
        </div>
      </Container>
    </section>
  );
}
