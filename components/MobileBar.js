import site from "@/site.config";
import Link from "next/link";
import { PhoneIcon, ChatIcon } from "./Icons";

// Barre fixe en bas sur mobile : Appeler · WhatsApp · Réserver
export default function MobileBar() {
  const btn =
    "fx inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full p-2.5 text-base font-bold leading-tight no-underline";
  return (
    <nav
      aria-label="Actions rapides"
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-[1.2fr_1fr_1fr] gap-2 bg-white px-3 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))] shadow-[0_-10px_30px_-18px_rgba(0,0,0,.45)] sm:hidden"
    >
      <a href={`tel:${site.telephone.lien}`} className={`${btn} bg-pri text-white`}>
        <PhoneIcon className="size-5" /> Appeler
      </a>
      <a href={`https://wa.me/${site.whatsapp}`} className={`${btn} border-2 border-ink text-ink`}>
        <ChatIcon className="size-5" /> WhatsApp
      </a>
      <Link href="/#reserver" className={`${btn} border-2 border-ink text-ink`}>
        Réserver
      </Link>
    </nav>
  );
}
