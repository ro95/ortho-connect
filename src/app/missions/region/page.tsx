import type { Metadata } from "next";
import IndexPage, { CarteIndex, GrilleEncarts, type DetailCarte } from "@/components/index-page";
import { formatAnciennete } from "@/lib/missions";
import {
  REFERENCE,
  SEUIL_REGION,
  getDepartements,
  getRegionsPubliees,
  getRegionsSansPage,
  getTypes,
  getVilles,
  urls,
  type ZoneRegion,
} from "@/lib/geo";
import { pluriel, texteIndexRegions } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

/**
 * Index des régions couvertes.
 *
 * Le palier régional existait en pages mais pas en index : `/missions/region`
 * répondait 404 et les régions ne recevaient de liens que du hub. Cette page
 * concentre ces liens et les redistribue, sur le même patron que l'index des
 * villes et celui des départements.
 */

const regions = getRegionsPubliees();
const sansPage = getRegionsSansPage();

const { chapeau, paragraphes } = texteIndexRegions({
  regions,
  regionsSansPage: sansPage.map((r) => ({ nom: r.nom, count: r.stats.total })),
});

const H1 = "Missions d'orthoptiste par région";

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste par région — ${regions.length} régions couvertes en France`,
  description: chapeau,
  chemin: urls.regions(),
});

export default function Page() {
  return (
    <IndexPage
      h1={H1}
      pastille={`${regions.length} régions`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: "Régions", chemin: urls.regions() },
      ]}
      faits={[
        { valeur: regions.length, label: "Régions couvertes" },
        { valeur: regions.reduce((n, r) => n + r.stats.total, 0), label: "Annonces cumulées" },
        { valeur: regions.reduce((n, r) => n + r.departements.length, 0), label: "Départements" },
        { valeur: regions.reduce((n, r) => n + r.stats.recentes30j, 0), label: "Publiées sur 30 j" },
      ]}
      pages={regions.map((r) => ({ nom: r.nom, chemin: urls.region(r.slug) }))}
      autresAxes={[
        { href: urls.departements(), label: `Par département (${getDepartements().length})` },
        { href: urls.villes(), label: `Par ville (${getVilles().length})` },
        { href: urls.types(), label: `Par type de mission (${getTypes().length})` },
        { href: urls.hub(), label: "Toutes les missions" },
      ]}
      complement={sansPage.length > 0 ? <RegionsSansPage /> : undefined}
    >
      <section className="mt-14">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Régions ayant leur propre page</h2>
        <GrilleEncarts>
          {regions.map((zone) => (
            <li key={zone.slug}>
              <CarteIndex
                href={urls.region(zone.slug)}
                titre={zone.nom}
                sousTitre={`${zone.departements.length} ${pluriel(zone.departements.length, "département")} ${pluriel(zone.departements.length, "pourvu")}`}
                total={zone.stats.total}
                details={detailsRegion(zone)}
              />
            </li>
          ))}
        </GrilleEncarts>
      </section>
    </IndexPage>
  );
}

function detailsRegion(zone: ZoneRegion): DetailCarte[] {
  const { stats, nbVilles, villes } = zone;
  const details: DetailCarte[] = [];

  const typeDominant = stats.types[0];
  if (typeDominant) {
    details.push({ label: "Surtout", valeur: `${typeDominant.type} (${typeDominant.count})` });
  }

  const specialite = stats.specialites[0];
  if (specialite) details.push({ label: "Le plus demandé", valeur: specialite.nom });

  // Communes concernées et communes ayant leur page sont deux chiffres distincts :
  // le second seul laisserait croire à une couverture plus étroite qu'elle n'est.
  if (nbVilles > 0) {
    details.push({
      label: "Communes",
      valeur: `${nbVilles} ${pluriel(nbVilles, "commune")}, dont ${villes.length} avec page`,
    });
  }

  details.push({ label: "Dernière annonce", valeur: formatAnciennete(stats.derniere, REFERENCE) });

  return details;
}

/**
 * Régions citées sans lien : avec un seul département pourvu, leur page ferait
 * doublon avec celle de ce département. On les nomme quand même pour qu'un
 * visiteur qui cherche sa région comprenne où sont passées ses annonces.
 */
function RegionsSansPage() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Régions sans page dédiée</h2>
      <p className="mt-2 max-w-3xl text-sm text-gray-500">
        Ces régions comptent moins de {SEUIL_REGION} départements pourvus : leur page reprendrait mot
        pour mot celle de ce département, où les annonces restent consultables.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {sansPage.map((zone) => (
          <li
            key={zone.slug}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
          >
            {zone.nom}
            <span className="text-xs text-gray-400">{zone.stats.total}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
