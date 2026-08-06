import { describe, expect, it } from "vitest";

import {
  deElide,
  enumerer,
  phraseFraicheur,
  pluriel,
  texteDepartement,
  texteType,
  texteVille,
} from "./redaction";
import {
  REFERENCE,
  getDepartements,
  getTypes,
  getVilles,
  type ZoneDepartement,
  type ZoneStats,
  type ZoneVille,
} from "./geo";
import { getDepartement } from "./departements";
import type { Mission } from "./missions";

/**
 * Ces pages sont écrites pour le référencement : une faute d'accord ou un
 * « d'remplacement » se lit immédiatement en production. On teste donc à la fois
 * les helpers de langue isolément et les textes complets produits pour TOUTES les
 * zones réelles, à la recherche de scories typographiques.
 */

/* ─────────────────────────── Helpers de langue ─────────────────────────── */

describe("pluriel", () => {
  it("reste au singulier pour 0 et 1", () => {
    expect(pluriel(1, "mission")).toBe("mission");
    expect(pluriel(0, "mission")).toBe("mission");
  });

  it("passe au pluriel à partir de 2", () => {
    expect(pluriel(2, "mission")).toBe("missions");
    expect(pluriel(12, "annonce")).toBe("annonces");
  });

  it("accepte une forme plurielle irrégulière explicite", () => {
    expect(pluriel(1, "est ouverte", "sont ouvertes")).toBe("est ouverte");
    expect(pluriel(3, "est ouverte", "sont ouvertes")).toBe("sont ouvertes");
    expect(pluriel(1, "a", "ont")).toBe("a");
    expect(pluriel(4, "a", "ont")).toBe("ont");
  });
});

describe("enumerer", () => {
  it("renvoie une chaîne vide pour une liste vide", () => {
    expect(enumerer([])).toBe("");
  });

  it("renvoie l'élément seul sans conjonction", () => {
    expect(enumerer(["réfraction"])).toBe("réfraction");
  });

  it("relie deux éléments par « et » sans virgule", () => {
    expect(enumerer(["réfraction", "rééducation"])).toBe("réfraction et rééducation");
  });

  it("sépare par des virgules et termine par « et »", () => {
    expect(enumerer(["réfraction", "rééducation", "basse vision"])).toBe(
      "réfraction, rééducation et basse vision",
    );
  });
});

describe("deElide", () => {
  it("élide devant une voyelle", () => {
    expect(deElide("association")).toBe("d'association");
    expect(deElide("orthoptie")).toBe("d'orthoptie");
    expect(deElide("intérim")).toBe("d'intérim");
  });

  it("élide devant une voyelle accentuée", () => {
    expect(deElide("équipe")).toBe("d'équipe");
    expect(deElide("échange")).toBe("d'échange");
    expect(deElide("île")).toBe("d'île");
  });

  it("élide devant un h muet", () => {
    expect(deElide("hébergement")).toBe("d'hébergement");
    expect(deElide("horaire")).toBe("d'horaire");
  });

  it("n'élide pas devant une consonne", () => {
    expect(deElide("remplacement")).toBe("de remplacement");
    expect(deElide("collaboration")).toBe("de collaboration");
    expect(deElide("salariat")).toBe("de salariat");
    expect(deElide("stage")).toBe("de stage");
    expect(deElide("cession")).toBe("de cession");
  });

  it("couvre tous les types de mission réellement présents dans les données", () => {
    for (const t of getTypes()) {
      const rendu = deElide(t.nom.toLowerCase());
      expect(rendu).toMatch(/^(d'[a-zàâäéèêëîïôöùûüÿç]|de [a-zàâäéèêëîïôöùûüÿç])/);
      expect(rendu).not.toMatch(/^de [aeiouyéèêâîôûh]/);
    }
  });
});

describe("phraseFraicheur", () => {
  const hier = decalerJours(REFERENCE, -1);

  it("branche « toutes récentes » quand chaque annonce a moins de trente jours", () => {
    const phrase = phraseFraicheur({ recentes30j: 5, total: 5, derniere: hier });
    expect(phrase).toBe("Toutes ont été publiées au cours des trente derniers jours, la plus récente hier.");
  });

  it("branche « une partie » avec les accords au singulier", () => {
    const phrase = phraseFraicheur({ recentes30j: 1, total: 6, derniere: hier });
    expect(phrase).toBe("1 a été publiée au cours des trente derniers jours, la plus récente hier.");
  });

  it("branche « une partie » avec les accords au pluriel", () => {
    const phrase = phraseFraicheur({ recentes30j: 3, total: 6, derniere: hier });
    expect(phrase).toBe("3 ont été publiées au cours des trente derniers jours, la plus récente hier.");
  });

  it("branche « aucune récente »", () => {
    const vieux = decalerJours(REFERENCE, -120);
    const phrase = phraseFraicheur({ recentes30j: 0, total: 4, derniere: vieux });
    expect(phrase).toMatch(/^La plus récente a été publiée il y a \d+ mois\.$/);
  });

  it("n'utilise pas « Toutes » quand la zone n'a qu'une seule annonce", () => {
    const phrase = phraseFraicheur({ recentes30j: 1, total: 1, derniere: hier });
    expect(phrase).not.toMatch(/^Toutes/);
    expect(phrase).toBe("1 a été publiée au cours des trente derniers jours, la plus récente hier.");
  });

  it("produit toujours une phrase complète et propre", () => {
    for (const cas of [
      { recentes30j: 5, total: 5, derniere: hier },
      { recentes30j: 1, total: 6, derniere: hier },
      { recentes30j: 0, total: 4, derniere: decalerJours(REFERENCE, -120) },
    ]) {
      attendreTexteCorrect(phraseFraicheur(cas));
    }
  });
});

/* ───────────────── Accords des textes générés (données forgées) ───────────────── */

describe("accords singulier / pluriel des textes de zone", () => {
  it("met tout au singulier pour une ville à une seule mission", () => {
    const zone = villeFictive({ nbMissions: 1, ville: "Pessac", codeDept: "33" });
    const { chapeau } = texteVille(zone, 1);
    expect(chapeau).toContain("1 mission d'orthoptie est ouverte à Pessac");
    expect(chapeau).toContain("1 remplacement.");
    expect(chapeau).not.toContain("missions");
    expect(chapeau).not.toContain("sont ouvertes");
  });

  it("met tout au pluriel pour une ville à plusieurs missions", () => {
    const zone = villeFictive({ nbMissions: 4, ville: "Bordeaux", codeDept: "33" });
    const { chapeau } = texteVille(zone, 4);
    expect(chapeau).toContain("4 missions d'orthoptie sont ouvertes à Bordeaux");
    expect(chapeau).toContain("4 remplacements.");
  });

  it("accorde le chapeau départemental sur une seule mission", () => {
    const zone = deptFictif({ nbMissions: 1, codeDept: "33" });
    const { chapeau } = texteDepartement(zone);
    expect(chapeau).toContain("1 mission d'orthoptie est ouverte en Gironde (33)");
  });

  it("accorde le chapeau départemental sur plusieurs missions", () => {
    const zone = deptFictif({ nbMissions: 7, codeDept: "33" });
    const { chapeau } = texteDepartement(zone);
    expect(chapeau).toContain("7 missions d'orthoptie sont ouvertes en Gironde (33)");
  });

  it("accorde la phrase des annonces sans commune", () => {
    const un = deptFictif({ nbMissions: 3, codeDept: "33", sansVille: 1 });
    const textes = texteDepartement(un).paragraphes.join(" ");
    expect(textes).toContain("1 annonce ne précise pas de commune et reste donc visible uniquement");

    const plusieurs = deptFictif({ nbMissions: 5, codeDept: "33", sansVille: 3 });
    const textes2 = texteDepartement(plusieurs).paragraphes.join(" ");
    expect(textes2).toContain("3 annonces ne précisent pas de commune et restent donc visibles uniquement");
  });

  it("accorde le chapeau de type et élide correctement", () => {
    const remplacement = texteType(typeFictif({ nbMissions: 6, type: "Remplacement" }), []);
    expect(remplacement.chapeau).toContain("6 offres de remplacement d'orthoptiste sont ouvertes en France");

    const association = texteType(typeFictif({ nbMissions: 1, type: "Association" }), []);
    expect(association.chapeau).toContain("1 offre d'association d'orthoptiste est ouverte en France");
  });

  it("accorde la mention du nombre de départements d'un type", () => {
    const seul = texteType(typeFictif({ nbMissions: 2, type: "Stage", codesDept: ["33", "33"] }), []);
    expect(seul.chapeau).toContain("dans un seul département");

    const plusieurs = texteType(typeFictif({ nbMissions: 2, type: "Stage", codesDept: ["33", "31"] }), []);
    expect(plusieurs.chapeau).toContain("réparties sur 2 départements");
  });

  it("accorde la phrase des structures", () => {
    const une = texteVille(villeFictive({ nbMissions: 1, ville: "Pessac", codeDept: "33" }), 1);
    expect(une.paragraphes.join(" ")).toContain("(1 offre sur 1)");

    const plusieurs = texteVille(villeFictive({ nbMissions: 3, ville: "Pessac", codeDept: "33" }), 3);
    expect(plusieurs.paragraphes.join(" ")).toContain("(3 offres sur 3)");
  });
});

/* ─────────── Qualité typographique sur toutes les zones réelles ─────────── */

describe("qualité typographique des textes réellement publiés", () => {
  const textes: { zone: string; texte: string }[] = [];

  for (const d of getDepartements()) {
    const { chapeau, paragraphes } = texteDepartement(d);
    textes.push({ zone: `département ${d.slug}`, texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `département ${d.slug} §${i + 1}`, texte: p }));
  }

  for (const v of getVilles()) {
    const total = v.departement ? (getDepartements().find((d) => d.departement.code === v.departement.code)?.stats.total ?? v.stats.total) : v.stats.total;
    const { chapeau, paragraphes } = texteVille(v, total);
    textes.push({ zone: `ville ${v.slug}`, texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `ville ${v.slug} §${i + 1}`, texte: p }));
  }

  for (const t of getTypes()) {
    const top = getDepartements()
      .map((d) => ({ nom: d.nom, count: d.missions.filter((m) => m.type === t.nom).length }))
      .filter((d) => d.count > 0)
      .slice(0, 4);
    const { chapeau, paragraphes } = texteType(t, top);
    textes.push({ zone: `type ${t.slug}`, texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `type ${t.slug} §${i + 1}`, texte: p }));
  }

  it("génère au moins un texte par zone", () => {
    expect(textes.length).toBeGreaterThan(getDepartements().length);
  });

  it("ne contient aucun double espace", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, faute: / {2}/.test(texte) }).toEqual({ zone, faute: false });
    }
  });

  it("ne contient aucune ponctuation doublée ni espace avant ponctuation faible", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, faute: /[.,;](\s*[.,;])/.test(texte) }).toEqual({ zone, faute: false });
      expect({ zone, faute: /\s[.,]/.test(texte) }).toEqual({ zone, faute: false });
    }
  });

  it("ne contient aucun segment vide (parenthèses vides, énumération tronquée)", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, faute: /\(\s*\)/.test(texte) }).toEqual({ zone, faute: false });
      expect({ zone, faute: /:\s*\./.test(texte) }).toEqual({ zone, faute: false });
      expect({ zone, faute: /\bet\s*[.,]/.test(texte) }).toEqual({ zone, faute: false });
    }
  });

  it("ne laisse fuiter aucune valeur technique", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, faute: /undefined|null|NaN|\[object/.test(texte) }).toEqual({ zone, faute: false });
    }
  });

  it("produit des phrases complètes, commençant par une majuscule ou un chiffre et finissant par un point", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, vide: texte.trim().length === 0 }).toEqual({ zone, vide: false });
      expect({ zone, ok: /^[A-ZÀÂÉÈÎÔÙÇ0-9]/.test(texte) }).toEqual({ zone, ok: true });
      expect({ zone, ok: texte.trimEnd().endsWith(".") }).toEqual({ zone, ok: true });
    }
  });

  it("n'écrit jamais « de » devant une voyelle dans les libellés de type", () => {
    for (const { zone, texte } of textes) {
      expect({ zone, faute: /\bde [aeiouéèêàâîôû]/i.test(texte) }).toEqual({ zone, faute: false });
    }
  });
});

/* ──────────────────────────────── Utilitaires ──────────────────────────────── */

function decalerJours(iso: string, jours: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + jours);
  return d.toISOString().slice(0, 10);
}

function attendreTexteCorrect(texte: string): void {
  expect(texte.trim().length).toBeGreaterThan(0);
  expect(texte).not.toMatch(/ {2}/);
  expect(texte).not.toMatch(/[.,;]\s*[.,;]/);
  expect(texte).not.toMatch(/undefined|NaN/);
  expect(texte.endsWith(".")).toBe(true);
}

let seq = 0;

function missionFictive(partiel: Partial<Mission>): Mission {
  seq += 1;
  return {
    id: `f-${seq}`,
    date: decalerJours(REFERENCE, -2),
    ville: "Pessac",
    departement: "Gironde",
    codeDept: "33",
    type: "Remplacement",
    structure: "Cabinet libéral",
    specialites: ["Réfraction"],
    resume: "Annonce fictive.",
    contact: "email",
    ...partiel,
  };
}

function statsDe(missions: Mission[]): ZoneStats {
  const compter = <T,>(valeurs: T[]) => {
    const map = new Map<T, number>();
    for (const v of valeurs) map.set(v, (map.get(v) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  };
  return {
    total: missions.length,
    types: compter(missions.map((m) => m.type)).map(([type, count]) => ({ type, count })),
    specialites: compter(missions.flatMap((m) => m.specialites)).map(([nom, count]) => ({ nom, count })),
    structures: compter(
      missions.map((m) => m.structure).filter((s): s is string => Boolean(s)),
    ).map(([nom, count]) => ({ nom, count })),
    recentes30j: missions.length,
    derniere: missions.reduce((max, m) => (m.date > max ? m.date : max), ""),
  };
}

function villeFictive({
  nbMissions,
  ville,
  codeDept,
}: {
  nbMissions: number;
  ville: string;
  codeDept: string;
}): ZoneVille {
  const missions = Array.from({ length: nbMissions }, () => missionFictive({ ville, codeDept }));
  return {
    kind: "ville",
    slug: ville.toLowerCase(),
    nom: ville,
    departement: getDepartement(codeDept)!,
    missions,
    stats: statsDe(missions),
  };
}

function deptFictif({
  nbMissions,
  codeDept,
  sansVille = 0,
}: {
  nbMissions: number;
  codeDept: string;
  sansVille?: number;
}): ZoneDepartement {
  const missions = Array.from({ length: nbMissions }, (_, i) =>
    missionFictive({ codeDept, ville: i < sansVille ? null : `Ville${i}` }),
  );
  const villes = missions
    .filter((m) => m.ville)
    .map((m) => villeFictive({ nbMissions: 1, ville: m.ville!, codeDept }));
  return {
    kind: "departement",
    slug: `dept-${codeDept}`,
    nom: getDepartement(codeDept)!.nom,
    departement: getDepartement(codeDept)!,
    missions,
    stats: statsDe(missions),
    villes,
    nbVilles: new Set(missions.map((m) => m.ville).filter(Boolean)).size,
  };
}

function typeFictif({
  nbMissions,
  type,
  codesDept,
}: {
  nbMissions: number;
  type: string;
  codesDept?: string[];
}) {
  const missions = Array.from({ length: nbMissions }, (_, i) =>
    missionFictive({ type, codeDept: codesDept?.[i] ?? "33" }),
  );
  return {
    kind: "type" as const,
    slug: type.toLowerCase(),
    nom: type,
    missions,
    stats: statsDe(missions),
  };
}
