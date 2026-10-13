import site from "@/site.config";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-bold text-pri">{site.nom}</h1>
      <p className="tbd mt-3">Site en construction autour de {site.base.ville}.</p>
      <a
        href={`tel:${site.telephone.lien}`}
        className="mt-6 inline-flex min-h-[52px] items-center rounded-full bg-pri px-8 font-bold text-white hover:bg-pri-hover"
      >
        Appeler {site.telephone.affiche}
      </a>
    </main>
  );
}
