// Données structurées (schema.org) pour Google : l'entreprise, ses communes desservies, le fil d'Ariane.
// Fonctions pures : le site et la commune sont passés en paramètres.

const adresseSite = (site, chemin = "") => `${site.url.replace(/\/$/, "")}${chemin}`;

// Une entreprise de taxi locale
export function donneesEntreprise(site, communes) {
  return {
    "@context": "https://schema.org",
    "@type": "TaxiService",
    name: site.nom,
    url: adresseSite(site),
    telephone: site.telephone.lien,
    areaServed: communes.map((c) => ({ "@type": "City", name: c.nom })),
    address: { "@type": "PostalAddress", addressLocality: site.base.ville, addressRegion: "Centre-Val de Loire", addressCountry: "FR" },
    priceRange: "€€",
  };
}

// Fil d'Ariane : Accueil > Taxi à Amilly
export function donneesFilAriane(site, commune, slug) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: adresseSite(site, "/") },
      { "@type": "ListItem", position: 2, name: `Taxi à ${commune.nom}`, item: adresseSite(site, `/taxi/${slug}`) },
    ],
  };
}

export { adresseSite };
