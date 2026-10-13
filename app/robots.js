import site from "@/site.config";
import { adresseSite } from "@/lib/seo";

// Consignes aux moteurs de recherche. Tant que site.indexation est false (démonstration, contenu provisoire),
// tout est interdit. Une fois le site ouvert : tout est autorisé sauf l'espace chauffeur et l'API.
export default function robots() {
  if (!site.indexation) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] },
    sitemap: adresseSite(site, "/sitemap.xml"),
  };
}
