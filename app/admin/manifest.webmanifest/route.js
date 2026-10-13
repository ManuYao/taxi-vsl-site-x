import site from "@/site.config";

// Manifeste de l'appli installable (espace chauffeur seulement : le site vitrine n'est pas une appli).
// Les noms viennent de site.config.js ; les couleurs sont celles de la palette.
export function GET() {
  const manifeste = {
    id: "/admin",
    name: `${site.nom} · Chauffeur`,
    short_name: "Chauffeur",
    description: "Courses à traiter et planning du chauffeur.",
    lang: "fr",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F7F5",
    theme_color: "#1E5B43",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifeste), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
