import type { Metadata } from "next";
import IndexPage, { CarteIndex, GrilleEncarts, type DetailCarte } from "@/components/index-page";
import { formatAnciennete } from "@/lib/missions";
import {
  REFERENCE,
  getDepartementByCode,
  getDepartements,
  getRegionsPubliees,
  getTypes,
  getVilles,
  urls,
  type ZoneType,
} from "@/lib/geo";
import { pluriel, texteIndexTypes } from "@/lib/redaction";
import { buildMetadata } from "@/lib/seo";

/**
 * Index des types de mission.
 *
 * Dernier des quatre segments d'URL qui répondaient 404. Le hub listait les types
 * en pastilles sans qu'aucune page ne porte l'axe lui-même : celle-ci lui donne un
 * contenu propre — où chaque format se concentre géographiquement — et redistribue
 * vers les pages de type.
 */

const types = getTypes();
const departements = getDepartements();

// Couverture géographique de l'ensemble des offres : c'est ce que l'axe « type »
// ne dit pas de lui-même, et ce qui distingue cet index d'une liste de libellés.
const nbCommunes = departements.reduce((n, d) => n + d.nbVilles, 0);

const { chapeau, paragraphes } = texteIndexTypes({
  types,
  nbDepartements: departements.length,
  nbCommunes,
});

const total = types.reduce((n, t) => n + t.stats.total, 0);

const H1 = "Missions d'orthoptiste par type de mission";

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste par type — ${types.length} formats recensés en France`,
  description: chapeau,
  chemin: urls.types(),
});

export default function Page() {
  return (
    <IndexPage
      h1={H1}
      pastille={`${types.length} types de mission`}
      chapeau={chapeau}
      paragraphes={paragraphes}
      fil={[
        { nom: "Accueil", chemin: "/" },
        { nom: "Missions", chemin: urls.hub() },
        { nom: "Types de mission", chemin: urls.types() },
      ]}
      faits={[
        { valeur: types.length, label: "Types de mission" },
        { valeur: total, label: "Annonces cumulées" },
        { valeur: departements.length, label: "Départements" },
        { valeur: types.reduce((n, t) => n + t.stats.recentes30j, 0), label: "Publiées sur 30 j" },
      ]}
      pages={types.map((t) => ({ nom: t.nom, chemin: urls.type(t.slug) }))}
      autresAxes={[
        { href: urls.departements(), label: `Par département (${departements.length})` },
        { href: urls.regions(), label: `Par région (${getRegionsPubliees().length})` },
        { href: urls.villes(), label: `Par ville (${getVilles().length})` },
        { href: urls.hub(), label: "Toutes les missions" },
      ]}
    >
      <section className="mt-14">
        <h2 className="text-xl font-bold tracking-tight text-gray-900">Les formats recensés</h2>
        <GrilleEncarts>
          {types.map((zone) => (
            <li key={zone.slug}>
              <CarteIndex
                href={urls.type(zone.slug)}
                titre={zone.nom}
                sousTitre={`${Math.round((zone.stats.total / total) * 100)} % des offres recensées`}
                total={zone.stats.total}
                details={detailsType(zone)}
              />
            </li>
          ))}
        </GrilleEncarts>
      </section>
    </IndexPage>
  );
}

/** Département où ce format est le plus représenté, s'il est identifiable. */
function departementDominant(zone: ZoneType): { nom: string; count: number } | null {
  const compteurs = new Map<string, number>();
  for (const m of zone.missions) {
    if (m.codeDept) compteurs.set(m.codeDept, (compteurs.get(m.codeDept) ?? 0) + 1);
  }

  const classement = [...compteurs.entries()]
    .flatMap(([code, count]) => {
      const dept = getDepartementByCode(code);
      return dept ? [{ dept, count }] : [];
    })
    // Départage alphabétique : le rendu doit être identique d'un build à l'autre.
    .sort((a, b) => b.count - a.count || a.dept.nom.localeCompare(b.dept.nom, "fr"));

  const tete = classement[0];
  if (!tete) return null;
  return { nom: `${tete.dept.nom} (${tete.dept.departement.code})`, count: tete.count };
}

function detailsType(zone: ZoneType): DetailCarte[] {
  const { stats, missions } = zone;
  const details: DetailCarte[] = [];

  const specialite = stats.specialites[0];
  if (specialite) details.push({ label: "Le plus demandé", valeur: specialite.nom });

  const dominant = departementDominant(zone);
  if (dominant) {
    details.push({ label: "Surtout", valeur: `${dominant.nom} — ${dominant.count}` });
  }

  const nbDepts = new Set(missions.map((m) => m.codeDept).filter(Boolean)).size;
  details.push({ label: "Présent dans", valeur: `${nbDepts} ${pluriel(nbDepts, "département")}` });

  details.push({ label: "Dernière annonce", valeur: formatAnciennete(stats.derniere, REFERENCE) });

  return details;
}
