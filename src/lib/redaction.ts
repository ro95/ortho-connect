import { formatAnciennete } from "./missions";
import { REFERENCE, type ZoneDepartement, type ZoneRegion, type ZoneType, type ZoneVille } from "./geo";

/**
 * Rédaction des textes d'introduction des pages de zone.
 *
 * Ces paragraphes sont *calculés* à partir des annonces réelles de la zone —
 * volume, répartition par type, spécialités demandées, structures qui recrutent,
 * fraîcheur — et non produits par un gabarit où seul le nom du lieu changerait.
 * C'est ce qui distingue une page utile d'une page dupliquée : deux zones aux
 * chiffres différents produisent deux textes différents.
 */

export function pluriel(n: number, singulier: string, plurielMot = `${singulier}s`): string {
  return n > 1 ? plurielMot : singulier;
}

/** « réfraction, rééducation et basse vision » */
export function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? "";
  return `${elements.slice(0, -1).join(", ")} et ${elements[elements.length - 1]}`;
}

function fraicheur(derniere: string): string {
  return formatAnciennete(derniere, REFERENCE);
}

/** Phrase de fraîcheur, omise si la donnée n'apporte rien. */
export function phraseFraicheur(stats: { recentes30j: number; derniere: string; total: number }): string {
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

/**
 * Au-delà de cette limite, la phrase cesse d'être lisible et devient une liste de
 * mots-clés. Les communes non citées restent comptées dans le total annoncé, et
 * toutes figurent de toute façon dans le bloc « Autres communes » de la page.
 */
const MAX_COMMUNES_CITEES = 8;

/** Commune sans page dédiée, telle qu'on la cite dans le texte. */
export interface CommuneCitee {
  nom: string;
  count: number;
}

/** Adapte les zones de l'index géographique à ce que la rédaction attend. */
export function citerCommunes(communes: ZoneVille[]): CommuneCitee[] {
  return communes.map(({ nom, missions }) => ({ nom, count: missions.length }));
}

/**
 * Rattache la longue traîne des communes à annonce unique au texte de la page qui
 * les couvre réellement. On les nomme sans les lier : elles n'ont pas de page, et
 * un lien mort ou une redirection en masse serait plus coûteux que le gain.
 */
export function phraseAutresCommunes(
  communes: CommuneCitee[],
  destination: string,
  limite = MAX_COMMUNES_CITEES,
): string | null {
  if (communes.length === 0) return null;

  const nbCommunes = communes.length;
  const totalAnnonces = communes.reduce((n, c) => n + c.count, 0);

  const citees = communes
    .slice(0, limite)
    .map(({ nom, count }) => (count > 1 ? `${nom} (${count})` : nom));
  const restantes = nbCommunes - citees.length;
  const liste = enumerer(
    restantes > 0 ? [...citees, `${restantes} ${pluriel(restantes, "autre")}`] : citees,
  );

  const debut =
    nbCommunes > 1
      ? `${nbCommunes} communes n'atteignent pas le volume qui justifierait leur propre page : ${liste}.`
      : `Une commune n'atteint pas le volume qui justifierait sa propre page : ${liste}.`;

  // Le possessif s'accorde sur le nombre de communes, le verbe sur celui d'annonces :
  // une seule commune peut porter plusieurs annonces si le seuil de publication bouge.
  const possessif = nbCommunes > 1 ? "Leurs" : "Ses";
  const suite =
    totalAnnonces > 1
      ? `${possessif} ${totalAnnonces} annonces sont regroupées`
      : "Son annonce est regroupée";

  return `${debut} ${suite} ${destination}.`;
}

/** « de remplacement » / « d'association » — élision devant voyelle ou h muet. */
export function deElide(mot: string): string {
  return /^[aeiouyâêîôûéèh]/i.test(mot.normalize("NFD").replace(/[̀-ͯ]/g, "")) ? `d'${mot}` : `de ${mot}`;
}

/* ─────────────────────────────── Région ──────────────────────────────── */

export function texteRegion(zone: ZoneRegion): { chapeau: string; paragraphes: string[] } {
  const { stats, region, departements, villes, nbVilles } = zone;
  const n = stats.total;
  const nbDepts = departements.length;

  const chapeau =
    `${n} ${pluriel(n, "mission")} d'orthoptie ${pluriel(n, "est ouverte", "sont ouvertes")} ${region.loc} : ` +
    `${repartitionTypes(stats.types)}. ${phraseFraicheur(stats)}`;

  const paragraphes: string[] = [];

  // Les départements sont triés par volume ici, alors que `zone.departements` reste
  // alphabétique pour l'affichage : dans un texte, ce qui intéresse le lecteur est
  // de savoir où se concentre l'activité, pas l'ordre du dictionnaire.
  const parVolume = [...departements].sort(
    (a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"),
  );

  if (nbDepts > 1) {
    const cites = parVolume.slice(0, 4).map((d) => `${d.nom} (${d.missions.length})`);
    const reste = nbDepts - cites.length;
    paragraphes.push(
      `Ces offres se répartissent sur ${nbDepts} départements : ` +
        `${enumerer(reste > 0 ? [...cites, `${reste} ${pluriel(reste, "autre")}`] : cites)}.`,
    );
  } else {
    const seul = parVolume[0];
    paragraphes.push(
      `Un seul département de la région recense actuellement des annonces : ` +
        `${seul.nom} (${seul.departement.code}).`,
    );
  }

  if (nbVilles > 0) {
    const tete = villes[0];
    const couverture = tete
      ? `dont ${villes.length} ${pluriel(villes.length, "avec sa propre page", "avec leur propre page")}. ` +
        `${tete.nom} en concentre le plus (${tete.missions.length}).`
      : `toutes rattachées à la page de leur département faute d'un volume suffisant.`;
    paragraphes.push(
      `${nbVilles} ${pluriel(nbVilles, "commune")} ${pluriel(nbVilles, "est concernée", "sont concernées")}, ` +
        couverture,
    );
  }

  const specialites = phraseSpecialites(stats.specialites, region.loc);
  if (specialites) paragraphes.push(specialites);

  const structures = phraseStructures(stats.structures, n);
  if (structures) paragraphes.push(structures);

  return { chapeau, paragraphes };
}

/* ───────────────────────────── Département ───────────────────────────── */

export function texteDepartement(
  zone: ZoneDepartement,
  autresCommunes: CommuneCitee[] = [],
): { chapeau: string; paragraphes: string[] } {
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

  const communes = phraseAutresCommunes(autresCommunes, "sur cette page");
  if (communes) paragraphes.push(communes);

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
  autresCommunes: CommuneCitee[] = [],
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

  const communes = phraseAutresCommunes(autresCommunes, "sur la page du département");
  if (communes) paragraphes.push(communes);

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
