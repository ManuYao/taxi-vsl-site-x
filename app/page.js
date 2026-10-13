import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Tiles from "@/components/Tiles";
import Reservation from "@/components/Reservation";
import Services from "@/components/Services";
import Conventionne from "@/components/Conventionne";
import Zones from "@/components/Zones";
import Apropos from "@/components/Apropos";
import Appel from "@/components/Appel";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import MobileBar from "@/components/MobileBar";
import TbdToggle from "@/components/TbdToggle";
import site from "@/site.config";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top" className="pb-24 sm:pb-0">
        <Hero />
        <Tiles />
        <Reservation />
        <Services />
        <Conventionne />
        <Zones />
        <Apropos />
        <Appel />
        <Faq />
      </main>
      <Footer />
      <MobileBar />
      {site.boutonTbd && <TbdToggle />}
    </>
  );
}
