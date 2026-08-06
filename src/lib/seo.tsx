import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "./constants";
import type { Mission } from "./missions";

/**
 * Métadonnées et données structurées des pages de zone.
 *
 * Volontairement PAS de balisage `JobPosting` : ce schéma exige l'organisation qui
 * recrute, un intitulé de poste et une date de validité, et l'on ne publie ni les
 * coordonnées ni l'identité des recruteurs. Déclarer des JobPosting incomplets ou
 * inventés relèverait du spam de données structurées et exposerait à une action
 * manuelle. `CollectionPage` + `ItemList` décrit honnêtement ce que la page est :
 * une liste de résumés d'annonces.
 */

interface PageSeo {
  titre: string;
  description: string;
  /** Chemin absolu depuis la racine, ex. « /missions/ville/toulouse ». */
  chemin: string;
  /** Renseigné lorsque la page doit pointer sa canonique ailleurs. */
  canonique?: string;
  /** Sort la page de l'index sans la retirer du site. */
  noindex?: boolean;
}

export function buildMetadata({ titre, description, chemin, canonique, noindex }: PageSeo): Metadata {
  const url = `${SITE_URL}${canonique ?? chemin}`;

  return {
    title: titre,
    description,
    alternates: { canonical: url },
    robots: noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: titre,
      description,
      url,
      siteName: SITE_NAME,
      locale: "fr_FR",
      type: "website",
    },
  };
}

/** Fil d'Ariane : `[{ nom, chemin }]`, de la racine à la page courante. */
export function breadcrumbJsonLd(elements: { nom: string; chemin: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: elements.map(({ nom, chemin }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: nom,
      item: `${SITE_URL}${chemin}`,
    })),
  };
}

/**
 * Liste des annonces de la page. On limite l'`ItemList` aux premières annonces :
 * au-delà, le balisage pèse plus qu'il n'apporte, et la page reste décrite fidèlement.
 */
export function collectionJsonLd(opts: {
  titre: string;
  description: string;
  chemin: string;
  missions: Mission[];
  limite?: number;
}) {
  const { titre, description, chemin, missions, limite = 20 } = opts;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: titre,
    description,
    url: `${SITE_URL}${chemin}`,
    inLanguage: "fr-FR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: missions.length,
      itemListElement: missions.slice(0, limite).map((m, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: `${m.type} — ${m.ville ?? m.departement ?? "France"}`,
      })),
    },
  };
}

/**
 * Liste de PAGES et non d'annonces : chaque élément porte son URL, ce qui décrit
 * un index de navigation. `collectionJsonLd` ne convient pas ici, ses éléments
 * sont des résumés d'offres sans URL propre.
 */
export function pagesJsonLd(opts: {
  titre: string;
  description: string;
  chemin: string;
  pages: { nom: string; chemin: string }[];
}) {
  const { titre, description, chemin, pages } = opts;

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: titre,
    description,
    url: `${SITE_URL}${chemin}`,
    inLanguage: "fr-FR",
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: pages.length,
      itemListElement: pages.map((page, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: page.nom,
        url: `${SITE_URL}${page.chemin}`,
      })),
    },
  };
}

/** `<script type="application/ld+json">` — à rendre dans le corps de la page. */
export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // Contenu construit par nos soins à partir des données locales, jamais d'entrée utilisateur.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
