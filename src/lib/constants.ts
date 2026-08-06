export const SITE_NAME = "LesOrthoptistes.fr";

/**
 * Origine absolue du site, nécessaire aux URLs canoniques, au sitemap et aux
 * données structurées — qui n'acceptent pas d'URL relative.
 * Surchargeable via NEXT_PUBLIC_SITE_URL (previews Vercel, recette).
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lesorthoptistes.fr").replace(/\/$/, "");

export const VALUE_PROPS = [
  {
    icon: "search",
    title: "Des missions triées pour vous",
    description:
      "Cabinets, cliniques, hôpitaux — on centralise les offres pour que vous n'ayez plus à chercher partout.",
  },
  {
    icon: "calendar",
    title: "Flexibilité totale",
    description:
      "CDD, remplacement, vacation : choisissez le rythme et le format qui vous conviennent.",
  },
  {
    icon: "shield",
    title: "Conçu pour les orthoptistes",
    description:
      "Pas de bruit. Pas de missions généralistes. Que de l'orthoptie, avec les bons critères.",
  },
] as const;

export const STATS = [
  { value: "4 800+", label: "Orthoptistes en France" },
  { value: "72%", label: "Cherchent de nouvelles missions" },
  { value: "0", label: "Plateforme dédiée… jusqu'ici" },
] as const;
