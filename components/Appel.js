import site from "@/site.config";
import { Container } from "./ui";

export default function Appel() {
  return (
    <section className="pb-16 sm:pb-[88px]">
      <Container>
        <div className="reveal relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[32px] bg-pri px-8 py-10 text-white sm:gap-8">
          <div aria-hidden="true" className="absolute -top-14 -right-14 size-[220px] rounded-full bg-white/10" />
          <div className="relative">
            <h2 className="text-[clamp(26px,3.6vw,38px)] font-extrabold leading-tight text-balance">
              Une question ? Appelez, tout simplement.
            </h2>
            <p className="mt-1.5 text-white/80">On vous répond et on réserve pour vous.</p>
          </div>
          <a
            href={`tel:${site.telephone.lien}`}
            className="fx fx-contour relative inline-flex min-h-[58px] items-center justify-center rounded-full bg-white px-[26px] py-3.5 text-[19px] font-bold tabular-nums text-dark no-underline"
          >
            {site.telephone.affiche}
          </a>
        </div>
      </Container>
    </section>
  );
}
