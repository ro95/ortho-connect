/**
 * Table canonique des départements français.
 *
 * Les annonces collectées écrivent le nom du département de façon irrégulière
 * (« Charente maritime », « Charente Maritimes », « Charente Maritime »… et même
 * « Oise » pour le 95). On ne peut donc pas dériver une URL du texte scrapé :
 * le code INSEE est la seule clé fiable, et c'est ce fichier qui fait autorité
 * pour le nom affiché, le slug et la formulation locative.
 *
 * `loc` est la locution complète (« en Haute-Garonne », « dans le Rhône »,
 * « à Paris ») : le genre et le nombre des départements sont trop irréguliers
 * pour être devinés par une règle, et une phrase d'introduction fausse se voit
 * immédiatement dans un contenu destiné au référencement.
 */

export interface Departement {
  /** Code INSEE, tel qu'il apparaît dans les données collectées ("31", "2B", "974"). */
  code: string;
  nom: string;
  /** Locution locative complète, à insérer telle quelle dans une phrase. */
  loc: string;
  region: string;
}

const TABLE: [code: string, nom: string, loc: string, region: string][] = [
  ["01", "Ain", "dans l'Ain", "Auvergne-Rhône-Alpes"],
  ["02", "Aisne", "dans l'Aisne", "Hauts-de-France"],
  ["03", "Allier", "dans l'Allier", "Auvergne-Rhône-Alpes"],
  ["04", "Alpes-de-Haute-Provence", "dans les Alpes-de-Haute-Provence", "Provence-Alpes-Côte d'Azur"],
  ["05", "Hautes-Alpes", "dans les Hautes-Alpes", "Provence-Alpes-Côte d'Azur"],
  ["06", "Alpes-Maritimes", "dans les Alpes-Maritimes", "Provence-Alpes-Côte d'Azur"],
  ["07", "Ardèche", "en Ardèche", "Auvergne-Rhône-Alpes"],
  ["08", "Ardennes", "dans les Ardennes", "Grand Est"],
  ["09", "Ariège", "en Ariège", "Occitanie"],
  ["10", "Aube", "dans l'Aube", "Grand Est"],
  ["11", "Aude", "dans l'Aude", "Occitanie"],
  ["12", "Aveyron", "en Aveyron", "Occitanie"],
  ["13", "Bouches-du-Rhône", "dans les Bouches-du-Rhône", "Provence-Alpes-Côte d'Azur"],
  ["14", "Calvados", "dans le Calvados", "Normandie"],
  ["15", "Cantal", "dans le Cantal", "Auvergne-Rhône-Alpes"],
  ["16", "Charente", "en Charente", "Nouvelle-Aquitaine"],
  ["17", "Charente-Maritime", "en Charente-Maritime", "Nouvelle-Aquitaine"],
  ["18", "Cher", "dans le Cher", "Centre-Val de Loire"],
  ["19", "Corrèze", "en Corrèze", "Nouvelle-Aquitaine"],
  ["2A", "Corse-du-Sud", "en Corse-du-Sud", "Corse"],
  ["2B", "Haute-Corse", "en Haute-Corse", "Corse"],
  ["21", "Côte-d'Or", "en Côte-d'Or", "Bourgogne-Franche-Comté"],
  ["22", "Côtes-d'Armor", "dans les Côtes-d'Armor", "Bretagne"],
  ["23", "Creuse", "dans la Creuse", "Nouvelle-Aquitaine"],
  ["24", "Dordogne", "en Dordogne", "Nouvelle-Aquitaine"],
  ["25", "Doubs", "dans le Doubs", "Bourgogne-Franche-Comté"],
  ["26", "Drôme", "dans la Drôme", "Auvergne-Rhône-Alpes"],
  ["27", "Eure", "dans l'Eure", "Normandie"],
  ["28", "Eure-et-Loir", "en Eure-et-Loir", "Centre-Val de Loire"],
  ["29", "Finistère", "dans le Finistère", "Bretagne"],
  ["30", "Gard", "dans le Gard", "Occitanie"],
  ["31", "Haute-Garonne", "en Haute-Garonne", "Occitanie"],
  ["32", "Gers", "dans le Gers", "Occitanie"],
  ["33", "Gironde", "en Gironde", "Nouvelle-Aquitaine"],
  ["34", "Hérault", "dans l'Hérault", "Occitanie"],
  ["35", "Ille-et-Vilaine", "en Ille-et-Vilaine", "Bretagne"],
  ["36", "Indre", "dans l'Indre", "Centre-Val de Loire"],
  ["37", "Indre-et-Loire", "en Indre-et-Loire", "Centre-Val de Loire"],
  ["38", "Isère", "en Isère", "Auvergne-Rhône-Alpes"],
  ["39", "Jura", "dans le Jura", "Bourgogne-Franche-Comté"],
  ["40", "Landes", "dans les Landes", "Nouvelle-Aquitaine"],
  ["41", "Loir-et-Cher", "en Loir-et-Cher", "Centre-Val de Loire"],
  ["42", "Loire", "dans la Loire", "Auvergne-Rhône-Alpes"],
  ["43", "Haute-Loire", "en Haute-Loire", "Auvergne-Rhône-Alpes"],
  ["44", "Loire-Atlantique", "en Loire-Atlantique", "Pays de la Loire"],
  ["45", "Loiret", "dans le Loiret", "Centre-Val de Loire"],
  ["46", "Lot", "dans le Lot", "Occitanie"],
  ["47", "Lot-et-Garonne", "en Lot-et-Garonne", "Nouvelle-Aquitaine"],
  ["48", "Lozère", "en Lozère", "Occitanie"],
  ["49", "Maine-et-Loire", "en Maine-et-Loire", "Pays de la Loire"],
  ["50", "Manche", "dans la Manche", "Normandie"],
  ["51", "Marne", "dans la Marne", "Grand Est"],
  ["52", "Haute-Marne", "en Haute-Marne", "Grand Est"],
  ["53", "Mayenne", "en Mayenne", "Pays de la Loire"],
  ["54", "Meurthe-et-Moselle", "en Meurthe-et-Moselle", "Grand Est"],
  ["55", "Meuse", "dans la Meuse", "Grand Est"],
  ["56", "Morbihan", "dans le Morbihan", "Bretagne"],
  ["57", "Moselle", "en Moselle", "Grand Est"],
  ["58", "Nièvre", "dans la Nièvre", "Bourgogne-Franche-Comté"],
  ["59", "Nord", "dans le Nord", "Hauts-de-France"],
  ["60", "Oise", "dans l'Oise", "Hauts-de-France"],
  ["61", "Orne", "dans l'Orne", "Normandie"],
  ["62", "Pas-de-Calais", "dans le Pas-de-Calais", "Hauts-de-France"],
  ["63", "Puy-de-Dôme", "dans le Puy-de-Dôme", "Auvergne-Rhône-Alpes"],
  ["64", "Pyrénées-Atlantiques", "dans les Pyrénées-Atlantiques", "Nouvelle-Aquitaine"],
  ["65", "Hautes-Pyrénées", "dans les Hautes-Pyrénées", "Occitanie"],
  ["66", "Pyrénées-Orientales", "dans les Pyrénées-Orientales", "Occitanie"],
  ["67", "Bas-Rhin", "dans le Bas-Rhin", "Grand Est"],
  ["68", "Haut-Rhin", "dans le Haut-Rhin", "Grand Est"],
  ["69", "Rhône", "dans le Rhône", "Auvergne-Rhône-Alpes"],
  ["70", "Haute-Saône", "en Haute-Saône", "Bourgogne-Franche-Comté"],
  ["71", "Saône-et-Loire", "en Saône-et-Loire", "Bourgogne-Franche-Comté"],
  ["72", "Sarthe", "dans la Sarthe", "Pays de la Loire"],
  ["73", "Savoie", "en Savoie", "Auvergne-Rhône-Alpes"],
  ["74", "Haute-Savoie", "en Haute-Savoie", "Auvergne-Rhône-Alpes"],
  ["75", "Paris", "à Paris", "Île-de-France"],
  ["76", "Seine-Maritime", "en Seine-Maritime", "Normandie"],
  ["77", "Seine-et-Marne", "en Seine-et-Marne", "Île-de-France"],
  ["78", "Yvelines", "dans les Yvelines", "Île-de-France"],
  ["79", "Deux-Sèvres", "dans les Deux-Sèvres", "Nouvelle-Aquitaine"],
  ["80", "Somme", "dans la Somme", "Hauts-de-France"],
  ["81", "Tarn", "dans le Tarn", "Occitanie"],
  ["82", "Tarn-et-Garonne", "en Tarn-et-Garonne", "Occitanie"],
  ["83", "Var", "dans le Var", "Provence-Alpes-Côte d'Azur"],
  ["84", "Vaucluse", "dans le Vaucluse", "Provence-Alpes-Côte d'Azur"],
  ["85", "Vendée", "en Vendée", "Pays de la Loire"],
  ["86", "Vienne", "dans la Vienne", "Nouvelle-Aquitaine"],
  ["87", "Haute-Vienne", "en Haute-Vienne", "Nouvelle-Aquitaine"],
  ["88", "Vosges", "dans les Vosges", "Grand Est"],
  ["89", "Yonne", "dans l'Yonne", "Bourgogne-Franche-Comté"],
  ["90", "Territoire de Belfort", "dans le Territoire de Belfort", "Bourgogne-Franche-Comté"],
  ["91", "Essonne", "dans l'Essonne", "Île-de-France"],
  ["92", "Hauts-de-Seine", "dans les Hauts-de-Seine", "Île-de-France"],
  ["93", "Seine-Saint-Denis", "en Seine-Saint-Denis", "Île-de-France"],
  ["94", "Val-de-Marne", "dans le Val-de-Marne", "Île-de-France"],
  ["95", "Val-d'Oise", "dans le Val-d'Oise", "Île-de-France"],
  ["971", "Guadeloupe", "en Guadeloupe", "Guadeloupe"],
  ["972", "Martinique", "en Martinique", "Martinique"],
  ["973", "Guyane", "en Guyane", "Guyane"],
  ["974", "La Réunion", "à La Réunion", "La Réunion"],
  ["976", "Mayotte", "à Mayotte", "Mayotte"],
];

export const DEPARTEMENTS: Map<string, Departement> = new Map(
  TABLE.map(([code, nom, loc, region]) => [code, { code, nom, loc, region }]),
);

export function getDepartement(code: string | null | undefined): Departement | null {
  return code ? (DEPARTEMENTS.get(code.toUpperCase()) ?? null) : null;
}

/* ─────────────────────────────── Régions ─────────────────────────────── */

export interface Region {
  nom: string;
  /** Locution locative complète, à insérer telle quelle dans une phrase. */
  loc: string;
}

/**
 * Locutions régionales, écrites à la main pour la même raison que celles des
 * départements : la préposition ne se déduit pas du nom. On dit « en Occitanie »
 * mais « dans les Hauts-de-France », « dans le Grand Est » mais « en Île-de-France »,
 * et « à La Réunion ». Aucune règle sur le genre ou l'initiale ne couvre ces cas,
 * et une préposition fausse est immédiatement visible dans un contenu de référencement.
 *
 * Un test vérifie que chaque région citée par la table des départements a bien
 * son entrée ici : ajouter un département dans une région oubliée fait échouer
 * la suite plutôt que de produire un texte bancal en production.
 */
const REGIONS_TABLE: [nom: string, loc: string][] = [
  ["Auvergne-Rhône-Alpes", "en Auvergne-Rhône-Alpes"],
  ["Bourgogne-Franche-Comté", "en Bourgogne-Franche-Comté"],
  ["Bretagne", "en Bretagne"],
  ["Centre-Val de Loire", "en Centre-Val de Loire"],
  ["Corse", "en Corse"],
  ["Grand Est", "dans le Grand Est"],
  ["Guadeloupe", "en Guadeloupe"],
  ["Guyane", "en Guyane"],
  ["Hauts-de-France", "dans les Hauts-de-France"],
  ["Île-de-France", "en Île-de-France"],
  ["La Réunion", "à La Réunion"],
  ["Martinique", "en Martinique"],
  ["Mayotte", "à Mayotte"],
  ["Normandie", "en Normandie"],
  ["Nouvelle-Aquitaine", "en Nouvelle-Aquitaine"],
  ["Occitanie", "en Occitanie"],
  ["Pays de la Loire", "dans les Pays de la Loire"],
  ["Provence-Alpes-Côte d'Azur", "en Provence-Alpes-Côte d'Azur"],
];

export const REGIONS: Map<string, Region> = new Map(
  REGIONS_TABLE.map(([nom, loc]) => [nom, { nom, loc }]),
);

export function getRegion(nom: string | null | undefined): Region | null {
  return nom ? (REGIONS.get(nom) ?? null) : null;
}
