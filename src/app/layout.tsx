import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LesOrthoptistes.fr — Trouvez vos missions en orthoptie",
  description:
    "La plateforme qui connecte les orthoptistes avec les missions qui leur correspondent. Inscrivez-vous pour être informé du lancement.",
  keywords: ["orthoptiste", "missions", "remplacement", "orthoptie", "freelance santé"],
  openGraph: {
    title: "LesOrthoptistes.fr — Trouvez vos missions en orthoptie",
    description:
      "La plateforme qui connecte les orthoptistes avec les missions qui leur correspondent.",
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
