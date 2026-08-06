import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ZonePage, { type BlocLiens, type BlocTexte } from "@/components/zone-page";
import {
  getCommunesSousLeSeuil,
  getDepartementBySlug,
  getDepartements,
  getDepartementsVoisins,
  getRegionByNom,
  getTypes,
  urls,
} from "@/lib/geo";
import { citerCommunes, texteDepartement } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getDepartements().map(({ slug }) => ({ slug }));
}

function titre(nom: string, code: string, total: number): string {
  return `Missions d'orthoptiste ${nom} (${code}) — ${total} offre${total > 1 ? "s" : ""}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const zone = getDepartementBySlug(slug);
  if (!zone) return {};

  const { chapeau } = texteDepartement(zone, citerCommunes(getCommunesSousLeSeuil(zone.departement.code)));

  return buildMetadata({
    titre: titre(zone.departement.nom, zone.departement.code, zone.stats.total),
    description: chapeau,
    chemin: urls.departement(slug),
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const zone = getDepartementBySlug(slug);
  if (!zone) notFound();

  const { departement, stats } = zone;
  const communesSansPage = getCommunesSousLeSeuil(departement.code);
  const { chapeau, paragraphes } = texteDepartement(zone, citerCommunes(communesSansPage));
  const region = getRegionByNom(departement.region);

  const blocs: BlocLiens[] = [];

  if (zone.villes.length > 0) {
    blocs.push({
      titre: `Missions par ville ${departement.loc}`,
      liens: zone.villes.map((v) => ({
        href: urls.ville(v.slug),
        label: v.nom,
        count: v.missions.length,
      })),
    });
  }

  // Lien remontant vers la région, en tête du bloc régional : c'est le palier
  // au-dessus, et la page qui recense l'ensemble des voisins non cités ici.
  const voisins = getDepartementsVoisins(zone);
  if (region) {
    blocs.push({
      titre: `Ailleurs ${region.region.loc}`,
      liens: [
        {
          href: urls.region(region.slug),
          label: `Toute la région — ${region.nom}`,
          count: region.missions.length,
        },
        ...voisins.map((d) => ({
          href: urls.departement(d.slug),
          label: `${d.nom} (${d.departement.code})`,
          count: d.missions.length,
        })),
      ],
    });
  }

  // On ne propose que les types réellement présents dans le département : un lien
  // vers une combinaison vide serait une impasse pour l'utilisateur comme pour le crawl.
  const typesPresents = new Set(stats.types.map((t) => t.type));
  const typesLies = getTypes().filter((t) => typesPresents.has(t.nom));
  if (typesLies.length > 0) {
    blocs.push({
      titre: "Par type de mission, partout en France",
      liens: typesLies.map((t) => ({
        href: urls.type(t.slug),
        label: t.nom,
        count: t.missions.length,
      })),
    });
  }

  const blocsTexte: BlocTexte[] = [];
  if (communesSansPage.length > 0) {
    blocsTexte.push({
      titre: `Autres communes ${departement.loc}`,
      note:
        `Ces communes comptent trop peu d'annonces pour justifier leur propre page. ` +
        `Leurs offres figurent dans la liste ci-dessus.`,
      entrees: communesSansPage.map((c) => ({ label: c.nom, count: c.missions.length })),
    });
  }

  return (
    <ZonePage
      zone={zone}
      h1={`Missions d'orthoptiste ${departement.loc} (${departement.code})`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      description={chapeau}
      zoneLead={`${departement.nom} (${departement.code})`}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        ...(region ? [{ nom: region.nom, chemin: urls.region(region.slug) }] : []),
        { nom: departement.nom, chemin: urls.departement(slug) },
      ]}
      faits={[
        { valeur: stats.total, label: "Missions ouvertes" },
        { valeur: zone.nbVilles, label: "Villes concernées" },
        { valeur: stats.types.length, label: "Types de contrat" },
        { valeur: stats.recentes30j, label: "Publiées sur 30 j" },
      ]}
      blocs={blocs}
      blocsTexte={blocsTexte}
    />
  );
}
