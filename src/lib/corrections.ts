/**
 * Corrections manuelles des communes mal extraites par le scraper.
 *
 * L'extraction de `scripts/scrape-missions.mjs` repose sur une heuristique : elle
 * cherche un nom propre précédé d'une préposition juste avant la parenthèse du
 * département. Elle est volontairement conservatrice — mieux vaut ne rien extraire
 * que de publier une raison sociale en guise de commune, puisque ces noms finissent
 * dans des pages indexées et dans les libellés de zone.
 *
 * Ce fichier rattrape ce que l'heuristique laisse passer ou refuse. Il s'applique à
 * la lecture des données, pas à la collecte : les annonces déjà collectées sont
 * corrigées sans attendre un nouveau scrape.
 *
 * La clé est le couple (valeur erronée, code département) et non l'identifiant de
 * l'annonce : l'identifiant est dérivé du nom de ville et changerait avec lui. Une
 * entrée dont la valeur erronée a disparu des données ne s'applique simplement plus.
 * Après chaque collecte, vérifier que cette table est toujours nécessaire.
 */

export interface CorrectionVille {
  /** Valeur telle que produite par le scraper. */
  de: string;
  codeDept: string;
  /** Commune réelle, lisible dans le résumé de l'annonce. */
  vers: string;
  /** Ce que le scraper a pris pour une commune. */
  motif: string;
}

export const CORRECTIONS_VILLE: CorrectionVille[] = [
  {
    de: "Direction de la Petite Enfance de la Ville de Lyon",
    codeDept: "69",
    vers: "Lyon",
    motif: "nom de l'employeur",
  },
  {
    de: "Clinique Mutualiste de Saint Etienne",
    codeDept: "42",
    vers: "Saint-Étienne",
    motif: "nom de l'établissement",
  },
  {
    de: "Nord de Toulouse",
    codeDept: "31",
    vers: "Castelnau d'Estretefonds",
    motif: "repère approximatif, la commune réelle est citée juste avant",
  },
  {
    de: "Garenne Colombes",
    codeDept: "92",
    vers: "La Garenne-Colombes",
    motif: "article initial absorbé par la préposition qui le précède",
  },
];

const parCle = new Map(CORRECTIONS_VILLE.map((c) => [`${c.de}|${c.codeDept}`, c.vers]));

export function corrigerVille(ville: string | null, codeDept: string | null): string | null {
  if (!ville) return ville;
  return parCle.get(`${ville}|${codeDept ?? ""}`) ?? ville;
}
