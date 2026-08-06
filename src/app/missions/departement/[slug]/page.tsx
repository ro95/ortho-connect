import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ZonePage, { type BlocLiens } from "@/components/zone-page";
import { getDepartementBySlug, getDepartements, getDepartementsVoisins, getTypes, urls } from "@/lib/geo";
import { texteDepartement } from "@/lib/redaction";
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

  const { chapeau } = texteDepartement(zone);

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
  const { chapeau, paragraphes } = texteDepartement(zone);

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

  const voisins = getDepartementsVoisins(zone);
  if (voisins.length > 0) {
    blocs.push({
      titre: `Autres départements en ${departement.region}`,
      liens: voisins.map((d) => ({
        href: urls.departement(d.slug),
        label: `${d.nom} (${d.departement.code})`,
        count: d.missions.length,
      })),
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
        { nom: departement.nom, chemin: urls.departement(slug) },
      ]}
      faits={[
        { valeur: stats.total, label: "Missions ouvertes" },
        { valeur: zone.nbVilles, label: "Villes concernées" },
        { valeur: stats.types.length, label: "Types de contrat" },
        { valeur: stats.recentes30j, label: "Publiées sur 30 j" },
      ]}
      blocs={blocs}
    />
  );
}
