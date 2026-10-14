import { Container, SectionHead } from "./ui";

const questions = [
  {
    q: "Combien va coûter ma course ?",
    r: "Le prix estimé s'affiche dès que vous indiquez le départ et l'arrivée. Le prix final est celui du taximètre.",
  },
  { q: "Dois-je créer un compte ?", r: "Non. Votre nom et votre téléphone suffisent." },
  {
    q: "On peut être plusieurs, avec un arrêt ?",
    r: "Oui. Indiquez le nombre de passagers et ajoutez un arrêt en chemin.",
  },
  { q: "Comment payer ?", r: "Moyens de paiement à confirmer.", tbd: true },
];

export default function Faq() {
  return (
    <section id="faq" className="scroll-mt-4 pb-16 sm:pb-[88px]">
      <Container>
        <SectionHead eyebrow="Questions" title="Avant de réserver" center />
        <div className="mx-auto flex max-w-[760px] flex-col gap-3">
          {questions.map(({ q, r, tbd }) => (
            <details key={q} className="carte-fx group rounded-[18px] bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-[22px] py-5 text-[19px] font-bold [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden="true" className="flex size-[34px] flex-none items-center justify-center rounded-full bg-soft text-[22px] text-pri">
                  <span className="group-open:hidden">+</span>
                  <span className="hidden group-open:inline">–</span>
                </span>
              </summary>
              <div className="px-[22px] pb-5 text-[#5a6366]">
                <span className={tbd ? "tbd" : ""}>{r}</span>
              </div>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
