import site from "@/site.config";
import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { PhoneIcon } from "@/components/Icons";
import { Container } from "@/components/ui";

export const metadata = { title: `Page introuvable · ${site.nom}`, robots: { index: false, follow: false } };

// Page affichée quand une adresse n'existe pas : on garde le téléphone sous la main, jamais d'impasse.
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="top">
        <Container className="flex max-w-[720px] flex-col items-start gap-5 py-20">
          <h1 className="font-title text-[clamp(32px,5vw,48px)] font-extrabold leading-tight tracking-tight">Cette page n&apos;existe pas</h1>
          <p className="text-xl text-[#5a6366]">Pas de souci : vous pouvez revenir à l&apos;accueil, ou nous appeler directement.</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="inline-flex min-h-[58px] items-center rounded-full border-2 border-ink px-[26px] text-[19px] font-bold text-ink no-underline hover:bg-soft">Retour à l&apos;accueil</Link>
            <a href={`tel:${site.telephone.lien}`} className="inline-flex min-h-[58px] items-center gap-2.5 rounded-full bg-pri px-[26px] text-[19px] font-bold text-white no-underline hover:bg-pri-hover">
              <PhoneIcon className="size-[22px]" />
              {site.telephone.affiche}
            </a>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
