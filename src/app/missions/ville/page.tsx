import Link from "next/link";
import type { Metadata } from "next";
import IndexPage, { CarteIndex, GrilleEncarts, type DetailCarte } from "@/components/index-page";
import { formatAnciennete } from "@/lib/missions";
import {
  REFERENCE,
  SEUIL_VILLE,
  getCommunesSousLeSeuil,
  getDepartements,
  getRegionsPubliees,
  getTypes,
  getVilles,
  getVillesParRegion,
  urls,
  type ZoneVille,
} from "@/lib/geo";
import { citerCommunes, texteIndexVilles } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

/**
 * Index des villes couvertes.
 *
 * `/missions/ville` était un segment d'URL traversé sans page : les 33 pages de
 * ville n'étaient atteignables que depuis le hub, qui les listait toutes. Cette
 * page devient le palier qui concentre les liens entrants puis les redistribue,
 * et le hub n'en garde qu'un teaser pour ne pas dupliquer la même liste.
 */

const villes = getVilles();

// `getVillesParRegion` part de TOUTES les régions, publiées ou non : c'est ce qui
// garantit qu'aucune ville ne se retrouve orpheline faute de région publiée.
const groupes = getVillesParRegion();

const communesSansPage = getDepartements().flatMap((d) => getCommunesSousLeSeuil(d.departement.code));

const { chapeau, paragraphes } = texteIndexVilles({
  villes,
  nbRegions: groupes.length,
  communesSansPage: citerCommunes(communesSansPage),
});

const H1 = "Missions d'orthoptiste par ville";

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste par ville — ${villes.length} villes couvertes en France`,
  description: chapeau,
  chemin: urls.villes(),
});

export default function Page() {
  return (
    <IndexPage
      h1={H1}
      pastille={`${villes.length} villes`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: "Villes", chemin: urls.villes() },
      ]}
      faits={[
        { valeur: villes.length, label: "Villes couvertes" },
        { valeur: villes.reduce((n, v) => n + v.stats.total, 0), label: "Annonces cumulées" },
        { valeur: groupes.length, label: "Régions concernées" },
        { valeur: villes.reduce((n, v) => n + v.stats.recentes30j, 0), label: "Publiées sur 30 j" },
      ]}
      pages={villes.map((v) => ({ nom: v.nom, chemin: urls.ville(v.slug) }))}
      autresAxes={[
        { href: urls.departements(), label: `Par département (${getDepartements().length})` },
        { href: urls.regions(), label: `Par région (${getRegionsPubliees().length})` },
        { href: urls.types(), label: `Par type de mission (${getTypes().length})` },
        { href: urls.hub(), label: "Toutes les missions" },
      ]}
      complement={communesSansPage.length > 0 ? <CommunesSansPage /> : undefined}
    >
      {groupes.map((groupe) => (
        <section key={groupe.region.nom} className="mt-14">
          <h2 className="text-xl font-bold tracking-tight text-gray-900">
            {groupe.publiee ? (
              <Link href={urls.region(groupe.slug)} className="transition-colors hover:text-primary-700">
                {groupe.region.nom}
              </Link>
            ) : (
              groupe.region.nom
            )}
          </h2>
          <GrilleEncarts>
            {groupe.villes.map((ville) => (
              <li key={ville.slug}>
                <CarteIndex
                  href={urls.ville(ville.slug)}
                  titre={ville.nom}
                  sousTitre={`${ville.departement.nom} (${ville.departement.code})`}
                  total={ville.stats.total}
                  details={detailsVille(ville)}
                />
              </li>
            ))}
          </GrilleEncarts>
        </section>
      ))}
    </IndexPage>
  );
}

function detailsVille(ville: ZoneVille): DetailCarte[] {
  const { stats } = ville;
  const details: DetailCarte[] = [];

  const typeDominant = stats.types[0];
  if (typeDominant) {
    details.push({ label: "Surtout", valeur: `${typeDominant.type} (${typeDominant.count})` });
  }

  const specialite = stats.specialites[0];
  if (specialite) details.push({ label: "Le plus demandé", valeur: specialite.nom });

  details.push({ label: "Dernière annonce", valeur: formatAnciennete(stats.derniere, REFERENCE) });

  return details;
}

/** Communes citées sans lien : elles n'ont pas de page à recevoir. */
function CommunesSansPage() {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold tracking-tight text-gray-900">Communes sans page dédiée</h2>
      <p className="mt-2 max-w-3xl text-sm text-gray-500">
        Ces communes comptent moins de {SEUIL_VILLE} annonces : leurs offres sont regroupées sur la page
        de leur département, où elles restent consultables.
      </p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {communesSansPage.map((commune) => (
          <li
            key={`${commune.slug}-${commune.departement.code}`}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
          >
            {commune.nom}
            <span className="text-xs text-gray-400">{commune.departement.code}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
