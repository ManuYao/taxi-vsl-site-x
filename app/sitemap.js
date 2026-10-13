import site from "@/site.config";
import { slugCommune } from "@/lib/communes";
import { adresseSite } from "@/lib/seo";

// Plan du site pour Google : l'accueil, une page par commune, les pages légales.
// Vide tant que le site n'est pas ouvert à l'indexation (site.indexation dans site.config.js).
export default function sitemap() {
  if (!site.indexation) return [];
  const maintenant = new Date();
  return [
    { url: adresseSite(site, "/"), lastModified: maintenant, changeFrequency: "monthly", priority: 1 },
    ...site.communes.map((c) => ({ url: adresseSite(site, `/taxi/${slugCommune(c.nom)}`), lastModified: maintenant, changeFrequency: "monthly", priority: 0.7 })),
    { url: adresseSite(site, "/mentions-legales"), lastModified: maintenant, changeFrequency: "yearly", priority: 0.2 },
    { url: adresseSite(site, "/confidentialite"), lastModified: maintenant, changeFrequency: "yearly", priority: 0.2 },
  ];
}
