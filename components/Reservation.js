import site from "@/site.config";
import { Container, SectionHead } from "./ui";
import { PinIcon } from "./Icons";
import BookingForm from "./booking/BookingForm";

const etapes = [
  {
    texte: "D'où, vers où",
    icone: <PinIcon className="size-6 text-soft2" />,
  },
  {
    texte: "Quand, combien de personnes",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6 text-soft2">
        <rect x="3" y="4" width="18" height="17" rx="2" />
        <path d="M3 9h18M8 2v4M16 2v4" />
      </svg>
    ),
  },
  {
    texte: "Votre nom et téléphone",
    icone: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="size-6 text-soft2">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    ),
  },
];

// Le formulaire lui-même arrive au bloc C. Ici : l'emplacement et les repères.
export default function Reservation() {
  return (
    <section id="reserver" className="relative mt-[88px] scroll-mt-4 bg-dark py-16 text-white sm:py-[88px]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-3.5 opacity-90"
        style={{ background: "repeating-conic-gradient(#fff 0 25%, var(--dark) 0 50%) 0 0 / 14px 14px" }}
      />
      <Container className="grid items-start gap-10 min-[980px]:grid-cols-[.8fr_1.2fr] min-[980px]:gap-14">
        <div>
          <SectionHead eyebrow="Réservation" title="Réservez en une minute" dark>
            <p className="text-[19px] text-[#c3ccc8]">Le prix s&apos;affiche avant d&apos;envoyer.</p>
          </SectionHead>
          <ul className="m-0 flex list-none flex-col gap-[18px] p-0">
            {etapes.map((e) => (
              <li key={e.texte} className="flex items-center gap-4 text-[19px]">
                <span className="flex size-12 flex-none items-center justify-center rounded-[14px] border border-white/15 bg-white/10">
                  {e.icone}
                </span>
                {e.texte}
              </li>
            ))}
          </ul>
          <p className="mt-7 text-[17px] text-[#c3ccc8]">
            Vous préférez appeler ?{" "}
            <a href={`tel:${site.telephone.lien}`} className="font-bold tabular-nums text-white">
              {site.telephone.affiche}
            </a>
          </p>
        </div>

        <BookingForm />
      </Container>
    </section>
  );
}
