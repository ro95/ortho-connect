import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ZonePage, { type BlocLiens } from "@/components/zone-page";
import { getRegionBySlug, getRegionsPubliees, getTypes, urls } from "@/lib/geo";
import { texteRegion } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

/** Au-delà, le bloc de villes cesse d'être un raccourci et devient un annuaire. */
const MAX_VILLES_LIEES = 12;

export function generateStaticParams() {
  return getRegionsPubliees().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const zone = getRegionBySlug(slug);
  if (!zone) return {};

  const { chapeau } = texteRegion(zone);

  return buildMetadata({
    // Le titre reprend la locution complète : « Missions d'orthoptiste dans les
    // Hauts-de-France » plutôt qu'un « en » plaqué qui serait faux une fois sur trois.
    titre: `Missions d'orthoptiste ${zone.region.loc} — ${zone.stats.total} offre${zone.stats.total > 1 ? "s" : ""}`,
    description: chapeau,
    chemin: urls.region(slug),
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const zone = getRegionBySlug(slug);
  if (!zone) notFound();

  const { region, stats } = zone;
  const { chapeau, paragraphes } = texteRegion(zone);

  const blocs: BlocLiens[] = [
    {
      titre: `Départements ${region.loc}`,
      liens: zone.departements.map((d) => ({
        href: urls.departement(d.slug),
        label: `${d.nom} (${d.departement.code})`,
        count: d.missions.length,
      })),
    },
  ];

  if (zone.villes.length > 0) {
    blocs.push({
      titre: `Villes les mieux fournies ${region.loc}`,
      liens: zone.villes.slice(0, MAX_VILLES_LIEES).map((v) => ({
        href: urls.ville(v.slug),
        label: v.nom,
        count: v.missions.length,
      })),
    });
  }

  // Comme sur les pages département : seuls les types réellement présents dans la
  // région sont proposés, un lien vers une combinaison vide étant une impasse.
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
      h1={`Missions d'orthoptiste ${region.loc}`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      description={chapeau}
      zoneLead={region.nom}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: region.nom, chemin: urls.region(slug) },
      ]}
      faits={[
        { valeur: stats.total, label: "Missions ouvertes" },
        { valeur: zone.departements.length, label: "Départements" },
        { valeur: zone.nbVilles, label: "Communes concernées" },
        { valeur: stats.recentes30j, label: "Publiées sur 30 j" },
      ]}
      blocs={blocs}
    />
  );
}
