import Link from "next/link";
import type { Metadata } from "next";
import IndexPage, { CarteIndex, GrilleEncarts, type DetailCarte } from "@/components/index-page";
import { formatAnciennete } from "@/lib/missions";
import {
  REFERENCE,
  getDepartements,
  getDepartementsParRegion,
  getRegionsPubliees,
  getTypes,
  getVilles,
  urls,
  type ZoneDepartement,
} from "@/lib/geo";
import { pluriel, texteIndexDepartements } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

/**
 * Index des départements couverts.
 *
 * Comme `/missions/ville` avant lui, `/missions/departement` était un segment
 * traversé sans page : les départements n'étaient atteignables que depuis le hub,
 * qui les listait tous. L'index prend le relais de cette liste, le hub n'en garde
 * qu'un teaser, et le palier départemental cesse d'être un trou dans le maillage.
 */

const departements = getDepartements();

// Toutes les régions, publiées ou non : un département dont la région n'a pas de
// page doit rester listé ici, sinon l'index cesse de redistribuer vers tous.
const groupes = getDepartementsParRegion();

const { chapeau, paragraphes } = texteIndexDepartements({
  departements,
  nbRegions: groupes.length,
});

const H1 = "Missions d'orthoptiste par département";

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste par département — ${departements.length} départements couverts en France`,
  description: chapeau,
  chemin: urls.departements(),
});

export default function Page() {
  return (
    <IndexPage
      h1={H1}
      pastille={`${departements.length} départements`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: "Départements", chemin: urls.departements() },
      ]}
      faits={[
        { valeur: departements.length, label: "Départements couverts" },
        { valeur: departements.reduce((n, d) => n + d.stats.total, 0), label: "Annonces cumulées" },
        { valeur: groupes.length, label: "Régions concernées" },
        { valeur: departements.reduce((n, d) => n + d.stats.recentes30j, 0), label: "Publiées sur 30 j" },
      ]}
      pages={departements.map((d) => ({
        nom: `${d.nom} (${d.departement.code})`,
        chemin: urls.departement(d.slug),
      }))}
      autresAxes={[
        { href: urls.regions(), label: `Par région (${getRegionsPubliees().length})` },
        { href: urls.villes(), label: `Par ville (${getVilles().length})` },
        { href: urls.types(), label: `Par type de mission (${getTypes().length})` },
        { href: urls.hub(), label: "Toutes les missions" },
      ]}
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
            {groupe.departements.map((zone) => (
              <li key={zone.slug}>
                <CarteIndex
                  href={urls.departement(zone.slug)}
                  titre={`${zone.nom} (${zone.departement.code})`}
                  sousTitre={groupe.region.nom}
                  total={zone.stats.total}
                  details={detailsDepartement(zone)}
                />
              </li>
            ))}
          </GrilleEncarts>
        </section>
      ))}
    </IndexPage>
  );
}

function detailsDepartement(zone: ZoneDepartement): DetailCarte[] {
  const { stats, nbVilles } = zone;
  const details: DetailCarte[] = [];

  const typeDominant = stats.types[0];
  if (typeDominant) {
    details.push({ label: "Surtout", valeur: `${typeDominant.type} (${typeDominant.count})` });
  }

  const specialite = stats.specialites[0];
  if (specialite) details.push({ label: "Le plus demandé", valeur: specialite.nom });

  // Le nombre de communes distingue un département concentré sur sa préfecture
  // d'un département où l'activité est dispersée : deux réalités très différentes
  // pour un orthoptiste qui évalue ses déplacements.
  if (nbVilles > 0) {
    details.push({
      label: "Communes",
      valeur: `${nbVilles} ${pluriel(nbVilles, "commune")}`,
    });
  }

  details.push({ label: "Dernière annonce", valeur: formatAnciennete(stats.derniere, REFERENCE) });

  return details;
}
