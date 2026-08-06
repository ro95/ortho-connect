import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ZonePage, { type BlocLiens } from "@/components/zone-page";
import { getDepartementByCode, getTypeBySlug, getTypes, urls } from "@/lib/geo";
import { texteType } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";
import type { ZoneType } from "@/lib/geo";

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return getTypes().map(({ slug }) => ({ slug }));
}

/** Départements où ce type de mission est le plus représenté. */
function topDepartements(zone: ZoneType, limite = 8) {
  const compteurs = new Map<string, number>();
  for (const m of zone.missions) {
    if (m.codeDept) compteurs.set(m.codeDept, (compteurs.get(m.codeDept) ?? 0) + 1);
  }

  return [...compteurs.entries()]
    .map(([code, count]) => ({ dept: getDepartementByCode(code), count }))
    .filter((d): d is { dept: NonNullable<ReturnType<typeof getDepartementByCode>>; count: number } =>
      Boolean(d.dept),
    )
    .sort((a, b) => b.count - a.count || a.dept.nom.localeCompare(b.dept.nom, "fr"))
    .slice(0, limite);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const zone = getTypeBySlug(slug);
  if (!zone) return {};

  const tops = topDepartements(zone).map(({ dept, count }) => ({ nom: dept.nom, count }));
  const { chapeau } = texteType(zone, tops);

  return buildMetadata({
    titre: `${zone.nom} orthoptiste — ${zone.stats.total} offre${zone.stats.total > 1 ? "s" : ""} en France`,
    description: chapeau,
    chemin: urls.type(slug),
  });
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const zone = getTypeBySlug(slug);
  if (!zone) notFound();

  const tops = topDepartements(zone);
  const { chapeau, paragraphes } = texteType(
    zone,
    tops.map(({ dept, count }) => ({ nom: dept.nom, count })),
  );

  const nbDepts = new Set(zone.missions.map((m) => m.codeDept).filter(Boolean)).size;
  const nbVilles = new Set(zone.missions.map((m) => m.ville).filter(Boolean)).size;

  const blocs: BlocLiens[] = [
    {
      titre: `Où trouver ces offres — ${zone.nom.toLowerCase()} par département`,
      liens: tops.map(({ dept, count }) => ({
        href: urls.departement(dept.slug),
        label: `${dept.nom} (${dept.departement.code})`,
        count,
      })),
    },
    {
      titre: "Autres types de mission",
      liens: getTypes()
        .filter((t) => t.slug !== slug)
        .map((t) => ({ href: urls.type(t.slug), label: t.nom, count: t.missions.length })),
    },
  ];

  return (
    <ZonePage
      zone={zone}
      h1={`${zone.nom} d'orthoptiste : les offres ouvertes en France`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      description={chapeau}
      zoneLead={zone.nom}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: zone.nom, chemin: urls.type(slug) },
      ]}
      faits={[
        { valeur: zone.stats.total, label: "Offres ouvertes" },
        { valeur: nbDepts, label: "Départements" },
        { valeur: nbVilles, label: "Villes" },
        { valeur: zone.stats.recentes30j, label: "Publiées sur 30 j" },
      ]}
      blocs={blocs}
    />
  );
}
