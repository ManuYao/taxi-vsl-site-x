import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Tiles from "@/components/Tiles";
import MobileBar from "@/components/MobileBar";

export default function Home() {
  return (
    <>
      <Header />
      <main id="top" className="pb-24 sm:pb-0">
        <Hero />
        <Tiles />
      </main>
      <MobileBar />
    </>
  );
}
