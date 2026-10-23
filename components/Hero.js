import site from "@/site.config";
import Link from "next/link";
import Voiture from "./Voiture";
import { PhoneIcon, CheckIcon, PlusIcon } from "./Icons";

const badges = ["Conventionné CPAM", "Sans compte", "Prix affiché avant"];

export default function Hero() {
  const communes = site.communesVedettes ?? site.communes.filter((c) => c.nom !== site.base.ville).slice(0, 5).map((c) => c.nom);

  return (
    <section className="overflow-hidden pt-6 pb-14">
      <div className="mx-auto grid max-w-[1160px] items-center gap-8 px-4 sm:px-8 min-[960px]:grid-cols-[1fr_1.1fr] min-[960px]:gap-6">
        <div className="flex min-w-0 flex-col gap-[22px]">
          <span className="text-sm font-bold uppercase tracking-[.1em] text-pri">
            Taxi · VSL · <span className="tbd">{site.infos.zoneCourte}</span>
          </span>
          <h1 className="text-[clamp(40px,6.4vw,68px)] font-extrabold leading-[1.02] tracking-tight text-balance">
            Votre taxi, <em className="not-italic text-pri">en un appel.</em>
          </h1>
          <p className="max-w-[32ch] text-xl text-[#5a6366]">
            Courses locales, rendez-vous médicaux, gares et aéroports.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={`tel:${site.telephone.lien}`}
              className="fx fx-pri fx-halo inline-flex min-h-[58px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full border-2 border-transparent bg-pri px-[26px] py-3.5 text-[19px] font-bold leading-tight text-white no-underline hover:bg-pri-hover"
            >
              <PhoneIcon className="fx-sonne size-[22px]" />
              {site.telephone.affiche}
            </a>
            <Link
              href="/#reserver"
              className="fx fx-contour inline-flex min-h-[58px] items-center justify-center whitespace-nowrap rounded-full border-2 border-ink bg-white px-[26px] py-3.5 text-[19px] font-bold leading-tight text-ink no-underline hover:bg-soft"
            >
              Réserver en ligne
            </Link>
          </div>
          <p className="max-w-[44ch] text-[17px] text-[#5a6366]">
            {communes.join(" · ")} · <span className="tbd">et toutes les communes voisines</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <span key={b} className="inline-flex items-center gap-2 rounded-full border border-[#e2e6e3] bg-bg py-1.5 pr-3.5 pl-2 text-[15px]">
                <i className="inline-flex size-[22px] items-center justify-center rounded-full bg-pri">
                  <CheckIcon className="size-[13px] text-white" />
                </i>
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="relative aspect-[1.2/1] min-w-0 max-w-full" aria-hidden="true">
          <div className="absolute inset-[4%_2%_8%_12%] rounded-full bg-soft" />
          <div className="absolute right-[-30%] bottom-[12%] h-[40%] w-[88%] -skew-x-12 rounded-l-[48px] bg-pri" />
          <Voiture className="anim-entree absolute bottom-[8%] left-[-4%] h-auto w-[108%] max-w-none" />
          <div className="anim-flotte tbd absolute top-[6%] left-[4%] flex flex-col gap-0.5 rounded-2xl bg-white px-4 py-3 text-sm text-[#5a6366] shadow-[0_18px_40px_-20px_rgba(15,25,20,.45)]">
            <span>{site.exemplePrix.trajet}</span>
            <b className="font-title text-[26px] leading-tight tabular-nums text-ink">{site.exemplePrix.montant}</b>
            <span>prix estimé avant de réserver</span>
          </div>
          <div className="anim-flotte absolute right-[4%] bottom-[2%] [animation-delay:-2.5s] flex items-center gap-2.5 rounded-2xl bg-white px-4 py-3 text-[15px] font-bold text-ink shadow-[0_18px_40px_-20px_rgba(15,25,20,.45)]">
            <i className="inline-flex size-[30px] items-center justify-center rounded-full bg-soft">
              <PlusIcon className="size-[18px] text-pri" />
            </i>
            Transport médical conventionné
          </div>
        </div>
      </div>
    </section>
  );
}
