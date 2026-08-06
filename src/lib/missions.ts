import data from "@/data/missions.json";

export interface Mission {
  id: string;
  /** ISO yyyy-mm-dd */
  date: string;
  ville: string | null;
  departement: string | null;
  codeDept: string | null;
  type: string;
  structure: string | null;
  specialites: string[];
  resume: string;
  /** Canal de contact publié dans l'annonce d'origine — jamais la coordonnée elle-même. */
  contact: "email" | "telephone" | "autre";
}

const missions = data.missions as Mission[];

/** Ordre d'affichage des filtres : les types les plus recherchés d'abord. */
const ORDRE_TYPES = ["Remplacement", "Collaboration", "Salariat", "Assistanat", "Association", "Cession", "Stage", "Mission"];

export function getMissions(): Mission[] {
  return missions;
}

export interface MissionsStats {
  total: number;
  departements: number;
  villes: number;
  recentes30j: number;
  types: { type: string; count: number }[];
  /** Date du dernier passage du script de collecte (ISO). */
  scrapedAt: string;
}

export function getMissionsStats(): MissionsStats {
  const parDate = [...missions].sort((a, b) => b.date.localeCompare(a.date));
  const derniere = parDate[0]?.date ?? data.scrapedAt.slice(0, 10);
  const seuil = new Date(derniere);
  seuil.setDate(seuil.getDate() - 30);
  const seuilIso = seuil.toISOString().slice(0, 10);

  const compteurs = new Map<string, number>();
  for (const m of missions) compteurs.set(m.type, (compteurs.get(m.type) ?? 0) + 1);

  return {
    total: missions.length,
    departements: new Set(missions.map((m) => m.codeDept).filter(Boolean)).size,
    villes: new Set(missions.map((m) => m.ville).filter(Boolean)).size,
    recentes30j: missions.filter((m) => m.date >= seuilIso).length,
    types: [...compteurs.entries()]
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => ORDRE_TYPES.indexOf(a.type) - ORDRE_TYPES.indexOf(b.type)),
    scrapedAt: data.scrapedAt,
  };
}

/** Libellé court « Ville (33) » avec repli sur le département seul. */
export function formatLieu(m: Mission): string {
  const code = m.codeDept ? ` (${m.codeDept})` : "";
  return `${m.ville ?? m.departement ?? "France"}${code}`;
}

/** « il y a 3 jours » — calculé côté serveur pour éviter tout écart d'hydratation. */
export function formatAnciennete(date: string, reference: string): string {
  const jours = Math.round((Date.parse(reference) - Date.parse(date)) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 14) return "il y a 1 semaine";
  if (jours < 31) return `il y a ${Math.floor(jours / 7)} semaines`;
  return `il y a ${Math.floor(jours / 30)} mois`;
}
