import { getMissions, type Mission } from "./missions";
import { getDepartement, getRegion, type Departement, type Region } from "./departements";

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

/**
 * Nombre minimum de départements pourvus pour qu'une région mérite sa propre page.
 *
 * Une région qui n'a qu'un seul département pourvu (les régions d'outre-mer, où
 * région et département se confondent) produirait une page portant le même nom et
 * listant exactement les mêmes annonces que la page du département : du contenu
 * dupliqué, pour le même motif que le seuil des villes. Ces régions restent
 * agrégées et affichées dans l'annuaire du hub, mais sans page dédiée.
 */
export const SEUIL_REGION = 2;

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
  kind: "region" | "departement" | "ville" | "type";
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

/**
 * Palier intermédiaire entre le hub national et les départements. Il capte les
 * requêtes régionales (« orthoptiste Occitanie ») et donne au maillage un étage
 * de plus, au lieu de faire pendre 77 départements directement sous une page.
 */
export interface ZoneRegion extends Zone {
  kind: "region";
  region: Region;
  /** Départements de la région ayant des annonces, par ordre alphabétique. */
  departements: ZoneDepartement[];
  /** Villes de la région ayant leur propre page, les mieux fournies d'abord. */
  villes: ZoneVille[];
  /** Villes distinctes concernées, seuil de publication compris ou non. */
  nbVilles: number;
  /** Vrai si la région a sa propre page (cf. SEUIL_REGION). */
  publiee: boolean;
}

export interface ZoneType extends Zone {
  kind: "type";
}

/* ─────────────────────── Construction des index ─────────────────────── */

const missions = getMissions();

/** Référence de fraîcheur : l'annonce la plus récente du jeu de données. */
export const REFERENCE = missions.reduce((max, m) => (m.date > max ? m.date : max), missions[0]?.date ?? "");

/** Date ISO située `jours` avant la référence de fraîcheur. */
function avantReference(jours: number): string {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - jours);
  return d.toISOString().slice(0, 10);
}

const SEUIL_30J = avantReference(30);

/**
 * En deçà, une annonce porte le badge « récente ».
 *
 * Calculé ici et non dans les composants : deux pages qui dateraient la même
 * annonce différemment se contrediraient, et le seuil se lit depuis la même
 * référence que le reste des statistiques.
 */
export const SEUIL_RECENT = avantReference(7);

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
    // Dédup sur le slug, comme partout ailleurs dans ce module : compter les noms
    // bruts ferait de « Saint Germain en Laye » et « Saint-Germain-en-Laye » deux
    // villes, et la phrase générée se contredirait (« 2 villes différentes » suivi
    // d'une seule ville nommée).
    nbVilles: new Set(liste.map((m) => (m.ville ? slugify(m.ville) : "")).filter(Boolean)).size,
  });
}
departements.sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));

const deptsParSlug = new Map(departements.map((d) => [d.slug, d]));
const deptsParCode = new Map(departements.map((d) => [d.departement.code, d]));

/**
 * Communes présentes dans les données mais sous le seuil de publication, indexées
 * par département. Elles n'ont pas de page : on les cite en clair sur la page de
 * leur département pour que leur nom y soit indexable, sans créer 150 pages minces.
 */
const communesSousLeSeuilParDept = new Map<string, ZoneVille[]>();
for (const v of toutesLesVilles) {
  if (villesParSlug.has(v.slug)) continue;
  const liste = communesSousLeSeuilParDept.get(v.departement.code);
  if (liste) liste.push(v);
  else communesSousLeSeuilParDept.set(v.departement.code, [v]);
}
for (const liste of communesSousLeSeuilParDept.values()) {
  liste.sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));
}

/* ── Régions ── */

const deptsParRegion = new Map<string, ZoneDepartement[]>();
for (const d of departements) {
  const liste = deptsParRegion.get(d.departement.region);
  if (liste) liste.push(d);
  else deptsParRegion.set(d.departement.region, [d]);
}

const regions: ZoneRegion[] = [];
for (const [nom, liste] of deptsParRegion) {
  const region = getRegion(nom);
  if (!region) continue;

  const missionsRegion = liste.flatMap((d) => d.missions);

  regions.push({
    kind: "region",
    slug: slugify(region.nom),
    nom: region.nom,
    region,
    departements: [...liste].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    villes: liste
      .flatMap((d) => d.villes)
      .sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr")),
    missions: [...missionsRegion].sort(parFraicheur),
    stats: calculerStats(missionsRegion),
    // La clé inclut le département, comme pour les slugs de ville : deux homonymes
    // dans deux départements d'une même région sont deux communes, pas une seule.
    // Ce comptage vaut donc exactement la somme des `nbVilles` des départements.
    nbVilles: new Set(
      missionsRegion
        .map((m) => (m.ville ? `${slugify(m.ville)}|${m.codeDept}` : ""))
        .filter((cle) => cle && !cle.startsWith("|")),
    ).size,
    publiee: liste.length >= SEUIL_REGION,
  });
}
regions.sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr"));

const regionsPubliees = regions.filter((r) => r.publiee);
const regionsParSlug = new Map(regionsPubliees.map((r) => [r.slug, r]));
const regionsParNom = new Map(regionsPubliees.map((r) => [r.region.nom, r]));

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

/**
 * Toutes les régions ayant des annonces, les mieux fournies d'abord — y compris
 * celles sans page dédiée, que l'annuaire du hub doit continuer d'afficher pour
 * ne perdre aucun département.
 */
export function getRegionsZones(): ZoneRegion[] {
  return regions;
}

/** Régions ayant leur propre page : celles-là seules sont générées et liées. */
export function getRegionsPubliees(): ZoneRegion[] {
  return regionsPubliees;
}

export function getRegionBySlug(slug: string): ZoneRegion | null {
  return regionsParSlug.get(slug) ?? null;
}

/**
 * Zone régionale publiée d'un département, pour le fil d'Ariane et le lien
 * remontant. Renvoie `null` pour une région sans page : les appelants retombent
 * alors sur un fil à trois niveaux plutôt que de fabriquer un lien mort.
 */
export function getRegionByNom(nom: string): ZoneRegion | null {
  return regionsParNom.get(nom) ?? null;
}

/** Villes publiées d'une même région, telles que l'index des villes les affiche. */
export interface GroupeVilles {
  region: Region;
  /** Slug de la page régionale — n'a de sens que si `publiee` est vrai. */
  slug: string;
  /** Faux pour une région sans page : le titre du groupe reste alors non lié. */
  publiee: boolean;
  villes: ZoneVille[];
}

/**
 * Regroupement des villes publiées par région, pour l'index `/missions/ville`.
 *
 * Le parcours part de TOUTES les régions, pas seulement des publiées : une ville
 * dont la région n'a pas de page doit rester affichée, sinon l'index cesse de
 * redistribuer vers l'intégralité des pages de ville.
 */
export function getVillesParRegion(): GroupeVilles[] {
  return regions
    .filter((r) => r.villes.length > 0)
    .map(({ region, slug, publiee, villes }) => ({ region, slug, publiee, villes }));
}

/**
 * Communes d'un département présentes dans les données mais sans page dédiée.
 * Elles sont citées en texte sur la page du département : un lien vers une page
 * inexistante, ou une redirection en masse, coûterait plus qu'il ne rapporterait.
 */
export function getCommunesSousLeSeuil(codeDept: string): ZoneVille[] {
  return communesSousLeSeuilParDept.get(codeDept) ?? [];
}

/* ── URLs ── */

// Le segment est déclaré une fois : l'index et les pages de ville partagent la
// même racine, et un changement de segment ne peut plus les désynchroniser.
const SEGMENT_VILLE = "/missions/ville";

export const urls = {
  hub: () => "/missions",
  region: (slug: string) => `/missions/region/${slug}`,
  departement: (slug: string) => `/missions/departement/${slug}`,
  villes: () => SEGMENT_VILLE,
  ville: (slug: string) => `${SEGMENT_VILLE}/${slug}`,
  type: (slug: string) => `/missions/type/${slug}`,
};
