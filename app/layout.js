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
  title: `${site.nom} — Taxi et VSL à ${site.base.ville}`,
  description: `Taxi, VSL conventionné et VTC autour de ${site.base.ville}. Appelez ou réservez en ligne.`,
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className={`${sora.variable} ${atkinson.variable}`}>
      <body>{children}</body>
    </html>
  );
}
