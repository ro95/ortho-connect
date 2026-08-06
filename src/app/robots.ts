import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

/**
 * Les trois branches interdites n'ont aucune valeur de recherche et coûtent du
 * budget de crawl : `/admin` et `/auth` sont des surfaces authentifiées (les
 * exposer révèle en plus la structure privée dans les résultats), `/api` ne
 * renvoie que du JSON et des endpoints d'écriture.
 *
 * Rappel : `Disallow` empêche le crawl, pas l'indexation d'une URL déjà connue.
 * Toute page qui doit vraiment sortir de l'index a besoin d'un `noindex`
 * (cf. l'option `noindex` de `buildMetadata`), pas d'une ligne ici.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/auth", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
