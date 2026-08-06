import { getMissions, type Mission } from "./missions";
import { getDepartement, type Departement } from "./departements";

/**
 * Index géographique et éditorial des missions.
 *
 * Tout est calculé une fois au chargement du module : les pages sont générées
 * statiquement au build, donc ce coût est payé une seule fois et jamais à l'exécution.
 */

/**
 * Nombre minimum d'annonces pour qu'une ville mérite sa propre page.
 *
 * 153 des 183 villes du jeu de données n'ont qu'une seule annonce. Leur créer une
 * page produirait une masse de pages quasi vides et quasi identiques — le profil
 * que Google sanctionne au niveau du domaine entier, pas seulement des pages
 * concernées. En dessous du seuil, la ville est rattachée à la page de son
 * département, qui elle a de la matière.
 */
export const SEUIL_VILLE = 2;

/** Slug URL : sans accents, sans ponctuation, minuscules. */
export function slugify(valeur: string): string {
  return valeur
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Spécialité la plus demandée, type dominant… — la matière éditoriale d'une page. */
export interface ZoneStats {
  total: number;
  /** Types présents, du plus fréquent au moins fréquent. */
  types: { type: string; count: number }[];
  /** Spécialités demandées, du plus fréquent au moins fréquent. */
  specialites: { nom: string; count: number }[];
  /** Structures qui recrutent, du plus fréquent au moins fréquent. */
  structures: { nom: string; count: number }[];
  /** Annonces publiées dans les 30 jours précédant la collecte. */
  recentes30j: number;
  /** Date de l'annonce la plus récente de la zone (ISO). */
  derniere: string;
}

export interface Zone {
  kind: "departement" | "ville" | "type";
  slug: string;
  /** Libellé affiché : « Haute-Garonne », « Toulouse », « Remplacement ». */
  nom: string;
  missions: Mission[];
  stats: ZoneStats;
}

export interface ZoneDepartement extends Zone {
  kind: "departement";
  departement: Departement;
  /** Villes de ce département qui ont leur propre page. */
  villes: ZoneVille[];
  /** Nombre de villes distinctes concernées, seuil compris ou non. */
  nbVilles: number;
}

export interface ZoneVille extends Zone {
  kind: "ville";
  departement: Departement;
}

export interface ZoneType extends Zone {
  kind: "type";
}

/* ─────────────────────── Construction des index ─────────────────────── */

const missions = getMissions();

/** Référence de fraîcheur : l'annonce la plus récente du jeu de données. */
export const REFERENCE = missions.reduce((max, m) => (m.date > max ? m.date : max), missions[0]?.date ?? "");

const SEUIL_30J = (() => {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
})();

function compter<T>(valeurs: T[]): { valeur: T; count: number }[] {
  const compteurs = new Map<T, number>();
  for (const v of valeurs) compteurs.set(v, (compteurs.get(v) ?? 0) + 1);
  return [...compteurs.entries()]
    .map(([valeur, count]) => ({ valeur, count }))
    // Tri par fréquence, puis alphabétique : le rendu doit être stable entre deux builds.
    .sort((a, b) => b.count - a.count || String(a.valeur).localeCompare(String(b.valeur), "fr"));
}

function calculerStats(liste: Mission[]): ZoneStats {
  return {
    total: liste.length,
    types: compter(liste.map((m) => m.type)).map(({ valeur, count }) => ({ type: valeur, count })),
    specialites: compter(liste.flatMap((m) => m.specialites)).map(({ valeur, count }) => ({ nom: valeur, count })),
    structures: compter(liste.map((m) => m.structure).filter((s): s is string => Boolean(s))).map(
      ({ valeur, count }) => ({ nom: valeur, count }),
    ),
    recentes30j: liste.filter((m) => m.date >= SEUIL_30J).length,
    derniere: liste.reduce((max, m) => (m.date > max ? m.date : max), ""),
  };
}

/** Tri d'affichage commun : la plus récente d'abord, id en départage pour la stabilité. */
function parFraicheur(a: Mission, b: Mission): number {
  return b.date.localeCompare(a.date) || a.id.localeCompare(b.id);
}

/* ── Villes ──
 * Les noms de villes collectés varient d'une annonce à l'autre (« Saint Etienne »,
 * « Saint-Étienne »). Le slug les réunit ; l'orthographe affichée est celle qui
 * revient le plus souvent, ce qui évite qu'un build à l'autre change le libellé.
 */
interface BrouillonVille {
  slugBase: string;
  codeDept: string;
  graphies: string[];
  missions: Mission[];
}

const brouillonsVilles = new Map<string, BrouillonVille>();
for (const m of missions) {
  if (!m.ville) continue;
  const slugBase = slugify(m.ville);
  if (!slugBase) continue;
  // La clé inclut le département : deux villes homonymes dans deux départements
  // sont deux endroits différents, pas une page à fusionner.
  const cle = `${slugBase}|${m.codeDept}`;
  const existant = brouillonsVilles.get(cle);
  if (existant) {
    existant.graphies.push(m.ville);
    existant.missions.push(m);
  } else {
    brouillonsVilles.set(cle, { slugBase, codeDept: m.codeDept ?? "", graphies: [m.ville], missions: [m] });
  }
}

// Un même slug porté par plusieurs départements (Vienne en Isère et Vienne dans le 86…)
// est désambiguïsé par le code : sans ça, une des deux villes écraserait l'autre.
const slugsPartages = new Set<string>();
const vusParSlug = new Map<string, number>();
for (const b of brouillonsVilles.values()) {
  const n = (vusParSlug.get(b.slugBase) ?? 0) + 1;
  vusParSlug.set(b.slugBase, n);
  if (n > 1) slugsPartages.add(b.slugBase);
}

const toutesLesVilles: ZoneVille[] = [];
for (const b of brouillonsVilles.values()) {
  const departement = getDepartement(b.codeDept);
  if (!departement) continue;

  const nom = compter(b.graphies)[0].valeur;
  const slug = slugsPartages.has(b.slugBase)
    ? `${b.slugBase}-${departement.code.toLowerCase()}`
    : b.slugBase;

  toutesLesVilles.push({
    kind: "ville",
    slug,
    nom,
    departement,
    missions: [...b.missions].sort(parFraicheur),
    stats: calculerStats(b.missions),
  });
}

/** Villes ayant leur propre page — les autres sont couvertes par leur département. */
const villesPubliees = toutesLesVilles
  .filter((v) => v.missions.length >= SEUIL_VILLE)
  .sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));

const villesParSlug = new Map(villesPubliees.map((v) => [v.slug, v]));

/**
 * Toutes les villes, publiées ou non, indexées par slug — sert à rediriger en
 * `canonical` une ville sous le seuil vers la page de son département.
 */
const villesParSlugComplet = new Map(toutesLesVilles.map((v) => [v.slug, v]));

/* ── Départements ── */

const missionsParDept = new Map<string, Mission[]>();
for (const m of missions) {
  if (!m.codeDept) continue;
  const liste = missionsParDept.get(m.codeDept);
  if (liste) liste.push(m);
  else missionsParDept.set(m.codeDept, [m]);
}

const departements: ZoneDepartement[] = [];
for (const [code, liste] of missionsParDept) {
  const departement = getDepartement(code);
  if (!departement) continue;

  departements.push({
    kind: "departement",
    slug: `${slugify(departement.nom)}-${departement.code.toLowerCase()}`,
    nom: departement.nom,
    departement,
    missions: [...liste].sort(parFraicheur),
    stats: calculerStats(liste),
    villes: villesPubliees.filter((v) => v.departement.code === code),
    nbVilles: new Set(liste.map((m) => m.ville).filter(Boolean)).size,
  });
}
departements.sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));

const deptsParSlug = new Map(departements.map((d) => [d.slug, d]));
const deptsParCode = new Map(departements.map((d) => [d.departement.code, d]));

/* ── Types de mission ── */

const missionsParType = new Map<string, Mission[]>();
for (const m of missions) {
  const liste = missionsParType.get(m.type);
  if (liste) liste.push(m);
  else missionsParType.set(m.type, [m]);
}

const types: ZoneType[] = [...missionsParType.entries()]
  .map(([type, liste]) => ({
    kind: "type" as const,
    slug: slugify(type),
    nom: type,
    missions: [...liste].sort(parFraicheur),
    stats: calculerStats(liste),
  }))
  .sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));

const typesParSlug = new Map(types.map((t) => [t.slug, t]));

/* ───────────────────────────── API publique ───────────────────────────── */

export function getDepartements(): ZoneDepartement[] {
  return departements;
}

export function getDepartementBySlug(slug: string): ZoneDepartement | null {
  return deptsParSlug.get(slug) ?? null;
}

export function getVilles(): ZoneVille[] {
  return villesPubliees;
}

export function getVilleBySlug(slug: string): ZoneVille | null {
  return villesParSlug.get(slug) ?? null;
}

/**
 * Ville présente dans les données mais sous le seuil de publication.
 * Utilisé pour renvoyer proprement vers la page du département plutôt que de
 * répondre 404 à une URL qui a pu être partagée ou indexée.
 */
export function getVilleNonPubliee(slug: string): ZoneVille | null {
  if (villesParSlug.has(slug)) return null;
  return villesParSlugComplet.get(slug) ?? null;
}

export function getTypes(): ZoneType[] {
  return types;
}

export function getTypeBySlug(slug: string): ZoneType | null {
  return typesParSlug.get(slug) ?? null;
}

export function getDepartementByCode(code: string): ZoneDepartement | null {
  return deptsParCode.get(code) ?? null;
}

/**
 * Départements de la même région ayant des annonces — le maillage interne le plus
 * utile pour un orthoptiste, qui cherche rarement à plus d'une région de chez lui.
 */
export function getDepartementsVoisins(zone: ZoneDepartement, limite = 6): ZoneDepartement[] {
  return departements
    .filter((d) => d.departement.region === zone.departement.region && d.slug !== zone.slug)
    .slice(0, limite);
}

/** Autres villes publiées du même département. */
export function getVillesVoisines(zone: ZoneVille, limite = 6): ZoneVille[] {
  return villesPubliees
    .filter((v) => v.departement.code === zone.departement.code && v.slug !== zone.slug)
    .slice(0, limite);
}

/** Départements groupés par région, pour l'annuaire du hub. */
export function getRegions(): { region: string; departements: ZoneDepartement[]; total: number }[] {
  const parRegion = new Map<string, ZoneDepartement[]>();
  for (const d of departements) {
    const liste = parRegion.get(d.departement.region);
    if (liste) liste.push(d);
    else parRegion.set(d.departement.region, [d]);
  }

  return [...parRegion.entries()]
    .map(([region, liste]) => ({
      region,
      departements: [...liste].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
      total: liste.reduce((n, d) => n + d.missions.length, 0),
    }))
    .sort((a, b) => b.total - a.total || a.region.localeCompare(b.region, "fr"));
}

/* ── URLs ── */

export const urls = {
  hub: () => "/missions",
  departement: (slug: string) => `/missions/departement/${slug}`,
  ville: (slug: string) => `/missions/ville/${slug}`,
  type: (slug: string) => `/missions/type/${slug}`,
};
