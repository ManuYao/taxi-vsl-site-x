import Footer from "./Footer";
import Link from "next/link";
import Header from "./Header";
import MobileBar from "./MobileBar";
import { Container } from "./ui";

// Information à fournir par le client : affichée en pointillé tant qu'elle est vide.
export function Info({ valeur, indication = "à compléter" }) {
  return valeur ? <>{valeur}</> : <span className="tbd">{indication}</span>;
}

export function Bloc({ titre, children }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-title text-2xl font-extrabold tracking-tight">{titre}</h2>
      {children}
    </section>
  );
}

// Page de texte (mentions légales, confidentialité) : en-tête, titre, contenu lisible, pied de page.
export default function PageLegale({ titre, misAJour, children }) {
  return (
    <>
      <Header />
      <main id="top" className="pb-24 sm:pb-0">
        <Container className="flex max-w-[820px] flex-col gap-10 py-12">
          <div className="flex flex-col gap-2">
            <nav aria-label="Fil d'Ariane" className="text-[15px] text-[#5a6366]">
              <Link href="/" className="text-pri underline underline-offset-2">Accueil</Link> · {titre}
            </nav>
            <h1 className="font-title text-[clamp(32px,5vw,48px)] font-extrabold leading-tight tracking-tight">{titre}</h1>
            {misAJour && <p className="text-[15px] text-[#5a6366]">Dernière mise à jour : {misAJour}</p>}
          </div>
          <div className="flex flex-col gap-9 text-lg leading-relaxed [&_a]:text-pri [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:pl-6">{children}</div>
        </Container>
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
