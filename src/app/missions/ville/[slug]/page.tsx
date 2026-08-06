import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import ZonePage, { type BlocLiens, type BlocTexte } from "@/components/zone-page";
import {
  getCommunesSousLeSeuil,
  getDepartementByCode,
  getRegionByNom,
  getVilleBySlug,
  getVilleNonPubliee,
  getVilles,
  getVillesVoisines,
  urls,
} from "@/lib/geo";
import { citerCommunes, texteVille } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * Seules les villes au-dessus du seuil sont pré-générées. Les autres restent
 * atteignables et sont redirigées en 308 vers leur département : une URL de ville
 * partagée ou déjà indexée ne doit pas se terminer en 404.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return getVilles().map(({ slug }) => ({ slug }));
}

function titre(nom: string, code: string, total: number): string {
  return `Missions d'orthoptiste à ${nom} (${code}) — ${total} offre${total > 1 ? "s" : ""}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const zone = getVilleBySlug(slug);
  if (!zone) return {};

  const departement = getDepartementByCode(zone.departement.code);
  const { chapeau } = texteVille(zone, departement?.stats.total ?? zone.stats.total);

  return buildMetadata({
    titre: titre(zone.nom, zone.departement.code, zone.stats.total),
    description: chapeau,
    chemin: urls.ville(slug),
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const zone = getVilleBySlug(slug);

  if (!zone) {
    const sousLeSeuil = getVilleNonPubliee(slug);
    const departement = sousLeSeuil ? getDepartementByCode(sousLeSeuil.departement.code) : null;
    if (departement) permanentRedirect(urls.departement(departement.slug));
    notFound();
  }

  const departement = getDepartementByCode(zone.departement.code);
  const totalDepartement = departement?.stats.total ?? zone.stats.total;
  const communesSansPage = getCommunesSousLeSeuil(zone.departement.code);
  const { chapeau, paragraphes } = texteVille(zone, totalDepartement, citerCommunes(communesSansPage));
  const region = getRegionByNom(zone.departement.region);
  const { stats } = zone;

  const blocs: BlocLiens[] = [];

  const voisines = getVillesVoisines(zone);
  if (voisines.length > 0) {
    blocs.push({
      titre: `Autres villes ${zone.departement.loc}`,
      liens: voisines.map((v) => ({
        href: urls.ville(v.slug),
        label: v.nom,
        count: v.missions.length,
      })),
    });
  }

  if (departement) {
    blocs.push({
      titre: "Élargir la recherche",
      liens: [
        {
          href: urls.departement(departement.slug),
          label: `Tout le département — ${departement.nom}`,
          count: departement.missions.length,
        },
        ...departement.villes
          .filter((v) => v.slug !== zone.slug && !voisines.some((n) => n.slug === v.slug))
          .map((v) => ({ href: urls.ville(v.slug), label: v.nom, count: v.missions.length })),
      ],
    });
  }

  const blocsTexte: BlocTexte[] = [];
  if (communesSansPage.length > 0) {
    blocsTexte.push({
      titre: `Autres communes ${zone.departement.loc}`,
      note:
        `Ces communes du département comptent trop peu d'annonces pour justifier leur propre ` +
        `page. Leurs offres sont regroupées sur la page du département.`,
      entrees: communesSansPage.map((c) => ({ label: c.nom, count: c.missions.length })),
    });
  }

  return (
    <ZonePage
      zone={zone}
      h1={`Missions d'orthoptiste à ${zone.nom}`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      description={chapeau}
      zoneLead={`${zone.nom} (${zone.departement.code})`}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        ...(region ? [{ nom: region.nom, chemin: urls.region(region.slug) }] : []),
        ...(departement ? [{ nom: departement.nom, chemin: urls.departement(departement.slug) }] : []),
        { nom: zone.nom, chemin: urls.ville(slug) },
      ]}
      faits={[
        { valeur: stats.total, label: "Missions à " + zone.nom },
        { valeur: totalDepartement, label: "Dans le département" },
        { valeur: stats.types.length, label: "Types de contrat" },
        { valeur: stats.recentes30j, label: "Publiées sur 30 j" },
      ]}
      blocs={blocs}
      blocsTexte={blocsTexte}
    />
  );
}
