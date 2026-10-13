import site from "@/site.config";

// L'espace chauffeur n'est pas un site public : il n'est pas référencé par les moteurs de recherche,
// et c'est lui (et non le site vitrine) qui s'installe comme appli sur l'écran d'accueil.
export const metadata = {
  title: `Espace chauffeur · ${site.nom}`,
  robots: { index: false, follow: false },
  manifest: "/admin/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "Chauffeur", statusBarStyle: "default" },
};

export const viewport = { themeColor: "#1E5B43", width: "device-width", initialScale: 1 };

export default function AdminLayout({ children }) {
  return children;
}
