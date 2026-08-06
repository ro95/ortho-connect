import { formatAnciennete } from "./missions";
import { REFERENCE, type ZoneDepartement, type ZoneType, type ZoneVille } from "./geo";

/**
 * Rédaction des textes d'introduction des pages de zone.
 *
 * Ces paragraphes sont *calculés* à partir des annonces réelles de la zone —
 * volume, répartition par type, spécialités demandées, structures qui recrutent,
 * fraîcheur — et non produits par un gabarit où seul le nom du lieu changerait.
 * C'est ce qui distingue une page utile d'une page dupliquée : deux zones aux
 * chiffres différents produisent deux textes différents.
 */

function pluriel(n: number, singulier: string, plurielMot = `${singulier}s`): string {
  return n > 1 ? plurielMot : singulier;
}

/** « réfraction, rééducation et basse vision » */
function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? "";
  return `${elements.slice(0, -1).join(", ")} et ${elements[elements.length - 1]}`;
}

function fraicheur(derniere: string): string {
  return formatAnciennete(derniere, REFERENCE);
}

/** Phrase de fraîcheur, omise si la donnée n'apporte rien. */
function phraseFraicheur(stats: { recentes30j: number; derniere: string; total: number }): string {
  const quand = fraicheur(stats.derniere);
  if (stats.recentes30j === stats.total && stats.total > 1) {
    return `Toutes ont été publiées au cours des trente derniers jours, la plus récente ${quand}.`;
  }
  if (stats.recentes30j > 0) {
    return `${stats.recentes30j} ${pluriel(stats.recentes30j, "a", "ont")} été ${pluriel(stats.recentes30j, "publiée", "publiées")} au cours des trente derniers jours, la plus récente ${quand}.`;
  }
  return `La plus récente a été publiée ${quand}.`;
}

/** « 8 remplacements, 3 collaborations et 1 poste salarié » */
function repartitionTypes(types: { type: string; count: number }[], limite = 3): string {
  return enumerer(
    types.slice(0, limite).map(({ type, count }) => `${count} ${pluriel(count, type.toLowerCase())}`),
  );
}

function phraseSpecialites(specialites: { nom: string; count: number }[], lieu: string): string | null {
  if (specialites.length === 0) return null;
  const top = specialites.slice(0, 3);
  const liste = enumerer(top.map(({ nom, count }) => `${nom.toLowerCase()} (${count})`));
  return `Les compétences les plus recherchées ${lieu} : ${liste}.`;
}

/**
 * Formulation sans article ni accord : le genre des libellés de structure
 * (« cabinet libéral », « maison de santé », « centre / clinique ») est trop
 * hétérogène pour être accordé automatiquement sans écrire de fautes.
 */
function phraseStructures(structures: { nom: string; count: number }[], total: number): string | null {
  if (structures.length === 0) return null;
  const [tete, ...reste] = structures;
  const debut = `Structure la plus représentée : ${tete.nom.toLowerCase()} (${tete.count} ${pluriel(tete.count, "offre")} sur ${total})`;
  if (reste.length === 0) return `${debut}.`;
  return `${debut}, devant ${enumerer(reste.slice(0, 2).map((s) => `${s.nom.toLowerCase()} (${s.count})`))}.`;
}

/** « de remplacement » / « d'association » — élision devant voyelle ou h muet. */
function deElide(mot: string): string {
  return /^[aeiouyâêîôûéèh]/i.test(mot.normalize("NFD").replace(/[̀-ͯ]/g, "")) ? `d'${mot}` : `de ${mot}`;
}

/* ───────────────────────────── Département ───────────────────────────── */

export function texteDepartement(zone: ZoneDepartement): { chapeau: string; paragraphes: string[] } {
  const { stats, departement, missions, nbVilles } = zone;
  const n = stats.total;

  const chapeau =
    `${n} ${pluriel(n, "mission")} d'orthoptie ${pluriel(n, "est ouverte", "sont ouvertes")} ${departement.loc} ` +
    `(${departement.code}) : ${repartitionTypes(stats.types)}. ${phraseFraicheur(stats)}`;

  const paragraphes: string[] = [];

  const specialites = phraseSpecialites(stats.specialites, `${departement.loc}`);
  if (specialites) paragraphes.push(specialites);

  const structures = phraseStructures(stats.structures, n);
  if (structures) paragraphes.push(structures);

  if (nbVilles > 1) {
    const tete = zone.villes[0];
    const detail = tete
      ? ` ${tete.nom} concentre le plus d'annonces (${tete.missions.length}).`
      : "";
    paragraphes.push(
      `Ces offres proviennent de ${nbVilles} villes ${pluriel(nbVilles, "différente", "différentes")} du département.${detail}`,
    );
  }

  const sansVille = missions.filter((m) => !m.ville).length;
  if (sansVille > 0) {
    paragraphes.push(
      `${sansVille} ${pluriel(sansVille, "annonce")} ne ${pluriel(sansVille, "précise", "précisent")} pas de commune et ${pluriel(sansVille, "reste", "restent")} donc visible${sansVille > 1 ? "s" : ""} uniquement sur cette page départementale.`,
    );
  }

  return { chapeau, paragraphes };
}

/* ─────────────────────────────── Ville ───────────────────────────────── */

export function texteVille(
  zone: ZoneVille,
  totalDepartement: number,
): { chapeau: string; paragraphes: string[] } {
  const { stats, departement, nom } = zone;
  const n = stats.total;

  const chapeau =
    `${n} ${pluriel(n, "mission")} d'orthoptie ${pluriel(n, "est ouverte", "sont ouvertes")} à ${nom} ` +
    `(${departement.nom}, ${departement.code}) : ${repartitionTypes(stats.types)}. ${phraseFraicheur(stats)}`;

  const paragraphes: string[] = [];

  const specialites = phraseSpecialites(stats.specialites, `à ${nom}`);
  if (specialites) paragraphes.push(specialites);

  const structures = phraseStructures(stats.structures, n);
  if (structures) paragraphes.push(structures);

  if (totalDepartement > n) {
    const part = Math.round((n / totalDepartement) * 100);
    paragraphes.push(
      `${nom} représente ${part} % des ${totalDepartement} annonces recensées ${departement.loc}. ` +
        `Si vous acceptez de vous déplacer, la page du département en recense ${totalDepartement - n} de plus.`,
    );
  }

  return { chapeau, paragraphes };
}

/* ─────────────────────────────── Type ────────────────────────────────── */

export function texteType(
  zone: ZoneType,
  topDepartements: { nom: string; count: number }[],
): { chapeau: string; paragraphes: string[] } {
  const { stats, nom } = zone;
  const n = stats.total;
  const label = nom.toLowerCase();
  const nbDepts = new Set(zone.missions.map((m) => m.codeDept).filter(Boolean)).size;

  // « offres de … » plutôt que le libellé du type seul : le genre des types varie
  // (un remplacement, une collaboration) et casserait tous les accords de la phrase.
  const chapeau =
    `${n} ${pluriel(n, "offre")} ${deElide(label)} d'orthoptiste ${pluriel(n, "est ouverte", "sont ouvertes")} ` +
    `en France, ${nbDepts > 1 ? `réparties sur ${nbDepts} départements` : "dans un seul département"}. ${phraseFraicheur(stats)}`;

  const paragraphes: string[] = [];

  if (topDepartements.length > 0) {
    paragraphes.push(
      `Les départements les plus actifs sur ce format : ` +
        `${enumerer(topDepartements.slice(0, 4).map((d) => `${d.nom} (${d.count})`))}.`,
    );
  }

  const specialites = phraseSpecialites(stats.specialites, "sur ce type de poste");
  if (specialites) paragraphes.push(specialites);

  const structures = phraseStructures(stats.structures, n);
  if (structures) paragraphes.push(structures);

  return { chapeau, paragraphes };
}
