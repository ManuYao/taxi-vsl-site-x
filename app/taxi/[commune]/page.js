import { notFound } from "next/navigation";
import Link from "next/link";
import site from "@/site.config";
import { distanceLisible, kmRoute, slugCommune, trouverCommune, voisines } from "@/lib/communes";
import { adresseSite, donneesEntreprise, donneesFilAriane } from "@/lib/seo";
import Appel from "@/components/Appel";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { CardIcon, ClockIcon, PhoneIcon, PinIcon } from "@/components/Icons";
import JsonLd from "@/components/JsonLd";
import MobileBar from "@/components/MobileBar";
import { Container, SectionHead } from "@/components/ui";

// Une page par commune desservie, fabriquée à la construction du site à partir de site.config.js.
// Toute autre adresse (/taxi/inconnue) appelle notFound() : page « introuvable ».
export function generateStaticParams() {
  return site.communes.map((c) => ({ commune: slugCommune(c.nom) }));
}

export async function generateMetadata({ params }) {
  const { commune: slug } = await params;
  const commune = trouverCommune(site.communes, slug);
  if (!commune) return {};
  const titre = `Taxi à ${commune.nom} (${commune.cp}) · ${site.nom}`;
  const description = `Taxi, VSL conventionné et transport vers les gares et aéroports à ${commune.nom} (${commune.cp}). Appelez le ${site.telephone.affiche} ou réservez en ligne : le prix est affiché avant.`;
  return {
    title: titre,
    description,
    alternates: { canonical: adresseSite(site, `/taxi/${slug}`) },
    openGraph: { title: titre, description, url: adresseSite(site, `/taxi/${slug}`), siteName: site.nom, locale: "fr_FR", type: "website" },
  };
}

const services = [
  { titre: "Taxi local", texte: "Courses du quotidien : courses, rendez-vous, sorties." },
  { titre: "Médical et VSL", texte: "Hôpital, dialyse, rééducation. Transport conventionné." },
  { titre: "Gares et aéroports", texte: "Trajets vers les gares, Orly et Roissy-CDG." },
  { titre: "Longue distance", texte: "Partout en France, avec arrêts possibles." },
];

export default async function PageCommune({ params }) {
  const { commune: slug } = await params;
  const commune = trouverCommune(site.communes, slug);
  if (!commune) notFound();

  // Distances par la route (estimées) vers les destinations les plus demandées : propres à chaque commune
  // (les destinations qui ont une `phrase` dans site.config.js)
  const trajets = site.destinations
    .filter((d) => d.phrase)
    .map((d) => ({ libelle: d.phrase, distance: distanceLisible(kmRoute(commune, d)) }));
  const proches = voisines(site.communes, commune, 6);
  const estBase = commune.nom === site.base.ville;

  return (
    <>
      <JsonLd data={donneesEntreprise(site, site.communes)} />
      <JsonLd data={donneesFilAriane(site, commune, slug)} />
      <Header />
      <main id="top" className="pb-24 sm:pb-0">
        <section className="bg-white pt-10 pb-14">
          <Container className="flex flex-col gap-6">
            <nav aria-label="Fil d'Ariane" className="text-[15px] text-[#5a6366]">
              <Link href="/" className="text-pri underline underline-offset-2">Accueil</Link> · Taxi à {commune.nom}
            </nav>
            <h1 className="max-w-[18ch] text-[clamp(36px,6vw,60px)] font-extrabold leading-[1.04] tracking-tight text-balance">
              Taxi à <span className="text-pri">{commune.nom}</span>
            </h1>
            <p className="max-w-[40ch] text-xl text-[#5a6366]">
              {commune.cp} {commune.nom}{estBase ? ", notre ville de départ" : `, à ${distanceLisible(kmRoute(commune, site.base)).replace(/^à /, "")} de ${site.base.ville}`}. Un taxi en un appel, ou réservez en ligne.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href={`tel:${site.telephone.lien}`} className="inline-flex min-h-[58px] items-center justify-center gap-2.5 whitespace-nowrap rounded-full bg-pri px-[26px] text-[19px] font-bold text-white no-underline hover:bg-pri-hover">
                <PhoneIcon className="size-[22px]" />
                {site.telephone.affiche}
              </a>
              <Link href="/#reserver" className="inline-flex min-h-[58px] items-center justify-center whitespace-nowrap rounded-full border-2 border-ink bg-white px-[26px] text-[19px] font-bold text-ink no-underline hover:bg-soft">
                Réserver en ligne
              </Link>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-[72px]">
          <Container>
            <SectionHead eyebrow={`Depuis ${commune.nom}`} title="Vos trajets les plus courants" />
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-0">
              {trajets.map((t) => (
                <li key={t.libelle} className="flex flex-col gap-1.5 rounded-[18px] bg-white p-5">
                  <PinIcon className="size-7 text-pri" />
                  <b className="text-lg">{commune.nom}</b>
                  <span className="text-[#5a6366]">{t.distance} {t.libelle}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[15px] text-[#5a6366]">Distances estimées par la route. Le prix exact s&apos;affiche avant de réserver.</p>
          </Container>
        </section>

        <section className="bg-white py-16 sm:py-[72px]">
          <Container>
            <SectionHead eyebrow="Services" title={`Ce que nous faisons à ${commune.nom}`} />
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-4 p-0">
              {services.map((s) => (
                <li key={s.titre} className="flex flex-col gap-1.5 rounded-[18px] bg-bg p-5">
                  <b className="font-title text-xl">{s.titre}</b>
                  <span className="text-[#5a6366]">{s.texte}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3 text-[15px] text-[#5a6366]">
              <span className="inline-flex items-center gap-2"><ClockIcon className="size-5 text-pri" />Horaires : <span className="tbd">{site.infos.horaires}</span></span>
              <span className="inline-flex items-center gap-2"><CardIcon className="size-5 text-pri" />Paiement : <span className="tbd">{site.infos.paiement}</span></span>
            </div>
          </Container>
        </section>

        <section className="py-16 sm:py-[72px]">
          <Container>
            <SectionHead eyebrow="Autour de vous" title={`Les communes voisines de ${commune.nom}`} />
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {proches.map((c) => (
                <li key={c.nom}>
                  <Link prefetch={false} href={`/taxi/${slugCommune(c.nom)}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-base text-ink no-underline hover:bg-soft">
                    Taxi à {c.nom} <small className="text-[#5a6366]">{distanceLisible(c.km).replace("environ ", "")}</small>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>

        <Appel />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
