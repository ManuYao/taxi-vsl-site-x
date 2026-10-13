import { Sora, Atkinson_Hyperlegible } from "next/font/google";
import "./globals.css";
import site from "@/site.config";

const sora = Sora({ variable: "--font-sora", subsets: ["latin"] });
const atkinson = Atkinson_Hyperlegible({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  metadataBase: new URL(site.url),
  title: `${site.nom} — Taxi et VSL à ${site.base.ville}`,
  description: `Taxi, VSL conventionné et VTC autour de ${site.base.ville}. Appelez ou réservez en ligne.`,
  // Tant que site.indexation est false, on demande aux moteurs de recherche de ne pas indexer le site (démonstration)
  robots: site.indexation ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: {
    siteName: site.nom,
    locale: "fr_FR",
    type: "website",
    title: `${site.nom} — Taxi et VSL à ${site.base.ville}`,
    description: `Taxi, VSL conventionné et VTC autour de ${site.base.ville}. Appelez ou réservez en ligne.`,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${sora.variable} ${atkinson.variable}`}>
      {/* suppressHydrationWarning : des extensions de navigateur ajoutent des attributs sur <body> avant le chargement de React */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
