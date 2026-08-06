import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  // Base des URLs relatives des métadonnées (images OG, canoniques). Les URLs
  // déjà absolues posées par `buildMetadata` ne sont pas réécrites.
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Trouvez vos missions en orthoptie`,
    /*
     * Séparateur « | » et non « — » : les titres des pages de zone contiennent
     * déjà un tiret cadratin (« Missions d'orthoptiste à Lyon (69) — 7 offres »),
     * et un second rendrait la marque indissociable du reste du titre.
     * Le nom du site n'apparaît dans aucun titre de page, il n'y a donc pas de
     * doublon possible ; `default` n'étant pas passé au template, l'accueil
     * garde son titre tel quel.
     */
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "La plateforme qui connecte les orthoptistes avec les missions qui leur correspondent. Inscrivez-vous pour être informé du lancement.",
  keywords: ["orthoptiste", "missions", "remplacement", "orthoptie", "freelance santé"],
  verification: {
    google: "3UjV6ntvmNl_EvIve27AcJvLM3DWvStyJ2fIOs499Sw",
  },
  openGraph: {
    title: `${SITE_NAME} — Trouvez vos missions en orthoptie`,
    description:
      "La plateforme qui connecte les orthoptistes avec les missions qui leur correspondent.",
    siteName: SITE_NAME,
    locale: "fr_FR",
    url: SITE_URL,
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-gray-900 font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
