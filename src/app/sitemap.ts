import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";
import { getDepartements, getRegionsPubliees, getTypes, getVilles, urls } from "@/lib/geo";

/**
 * Le sitemap ne liste que les pages indexables : les villes sous le seuil n'y
 * figurent pas, puisqu'elles redirigent vers leur département, ni les régions à
 * département unique, qui n'ont pas de page propre.
 *
 * `lastModified` est la date de l'annonce la plus récente de la zone — un signal
 * honnête de fraîcheur, contrairement à la date du build qui changerait toutes
 * les URLs à chaque déploiement sans que rien n'ait bougé.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const regions = getRegionsPubliees();
  const departements = getDepartements();
  const villes = getVilles();
  const types = getTypes();

  const plusRecente = [...departements, ...types].reduce(
    (max, z) => (z.stats.derniere > max ? z.stats.derniere : max),
    "",
  );

  return [
    { url: `${SITE_URL}/`, lastModified: plusRecente, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}${urls.hub()}`, lastModified: plusRecente, changeFrequency: "daily", priority: 0.9 },
    ...regions.map((r) => ({
      url: `${SITE_URL}${urls.region(r.slug)}`,
      lastModified: r.stats.derniere,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
    ...departements.map((d) => ({
      url: `${SITE_URL}${urls.departement(d.slug)}`,
      lastModified: d.stats.derniere,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...villes.map((v) => ({
      url: `${SITE_URL}${urls.ville(v.slug)}`,
      lastModified: v.stats.derniere,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...types.map((t) => ({
      url: `${SITE_URL}${urls.type(t.slug)}`,
      lastModified: t.stats.derniere,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
