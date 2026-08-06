import { describe, expect, it } from "vitest";

import {
  deElide,
  enumerer,
  phraseAutresCommunes,
  phraseFraicheur,
  pluriel,
  texteDepartement,
  texteRegion,
  texteType,
  texteVille,
  texteIndexDepartements,
  texteIndexRegions,
  texteIndexTypes,
  texteIndexVilles,
} from "./redaction";
import {
  REFERENCE,
  getCommunesSousLeSeuil,
  getDepartements,
  getRegionsPubliees,
  getRegionsSansPage,
  getTypes,
  getVilles,
  type ZoneDepartement,
  type ZoneRegion,
  type ZoneStats,
  type ZoneVille,
} from "./geo";
import { getDepartement, getRegion } from "./departements";
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

describe("phraseAutresCommunes", () => {
  it("ne dit rien quand aucune commune n'est concernée", () => {
    expect(phraseAutresCommunes([], "sur cette page")).toBeNull();
  });

  it("accorde tout au singulier pour une commune à annonce unique", () => {
    expect(phraseAutresCommunes([{ nom: "Pessac", count: 1 }], "sur cette page")).toBe(
      "Une commune n'atteint pas le volume qui justifierait sa propre page : Pessac. " +
        "Son annonce est regroupée sur cette page.",
    );
  });

  it("accorde le possessif sur les communes et le verbe sur les annonces", () => {
    expect(phraseAutresCommunes([{ nom: "Pessac", count: 3 }], "sur cette page")).toContain(
      "Ses 3 annonces sont regroupées",
    );
    expect(
      phraseAutresCommunes(
        [
          { nom: "Pessac", count: 1 },
          { nom: "Talence", count: 1 },
        ],
        "sur cette page",
      ),
    ).toContain("Leurs 2 annonces sont regroupées");
  });

  it("énumère les communes et n'affiche le compte que s'il dépasse une annonce", () => {
    const phrase = phraseAutresCommunes(
      [
        { nom: "Pessac", count: 2 },
        { nom: "Talence", count: 1 },
        { nom: "Mérignac", count: 1 },
      ],
      "sur cette page",
    );
    expect(phrase).toContain("Pessac (2), Talence et Mérignac.");
  });

  it("tronque la liste et compte le reste plutôt que d'aligner les mots-clés", () => {
    const communes = Array.from({ length: 12 }, (_, i) => ({ nom: `Commune${i}`, count: 1 }));
    const phrase = phraseAutresCommunes(communes, "sur cette page", 3)!;
    expect(phrase).toContain("12 communes n'atteignent pas");
    expect(phrase).toContain("Commune0, Commune1, Commune2 et 9 autres.");
    expect(phrase).not.toContain("Commune3");
    expect(phrase).toContain("Leurs 12 annonces sont regroupées sur cette page.");
  });

  it("écrit « 1 autre » au singulier", () => {
    const communes = Array.from({ length: 3 }, (_, i) => ({ nom: `Commune${i}`, count: 1 }));
    expect(phraseAutresCommunes(communes, "sur cette page", 2)).toContain(
      "Commune0, Commune1 et 1 autre.",
    );
  });

  it("adapte la destination du regroupement", () => {
    expect(phraseAutresCommunes([{ nom: "Pessac", count: 1 }], "sur la page du département")).toContain(
      "regroupée sur la page du département.",
    );
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

/* ────────────────────────────── texteRegion ────────────────────────────── */

describe("texteRegion", () => {
  it("emploie la locution de la région, jamais un « en » plaqué", () => {
    // C'est exactement le cas que la table de locutions existe pour couvrir :
    // « en Occitanie » mais « dans les Hauts-de-France ».
    expect(texteRegion(regionFictive({ codesDept: ["31", "34"] })).chapeau).toContain(
      "sont ouvertes en Occitanie :",
    );
    expect(texteRegion(regionFictive({ codesDept: ["59", "62"] })).chapeau).toContain(
      "sont ouvertes dans les Hauts-de-France :",
    );
    expect(texteRegion(regionFictive({ codesDept: ["75", "92"] })).chapeau).toContain(
      "sont ouvertes en Île-de-France :",
    );
    expect(texteRegion(regionFictive({ codesDept: ["67", "57"] })).chapeau).toContain(
      "sont ouvertes dans le Grand Est :",
    );
    expect(texteRegion(regionFictive({ codesDept: ["974"] })).chapeau).toContain(
      "est ouverte à La Réunion :",
    );
  });

  it("accorde le chapeau sur une seule mission", () => {
    const { chapeau } = texteRegion(regionFictive({ codesDept: ["974"] }));
    expect(chapeau).toContain("1 mission d'orthoptie est ouverte");
    expect(chapeau).not.toContain("sont ouvertes");
  });

  it("dit explicitement qu'un seul département est pourvu plutôt que d'énumérer une liste d'un", () => {
    const { paragraphes } = texteRegion(regionFictive({ codesDept: ["974"] }));
    expect(paragraphes.join(" ")).toContain(
      "Un seul département de la région recense actuellement des annonces : La Réunion (974).",
    );
    expect(paragraphes.join(" ")).not.toContain("se répartissent sur");
  });

  it("classe les départements par volume et tronque au-delà de quatre", () => {
    const zone = regionFictive({ codesDept: ["31", "34", "30", "81", "46"], parDept: [1, 5, 2, 1, 1] });
    const paragraphe = texteRegion(zone).paragraphes[0];
    expect(paragraphe).toContain("Ces offres se répartissent sur 5 départements :");
    expect(paragraphe).toContain("Hérault (5), Gard (2), Haute-Garonne (1), Lot (1) et 1 autre.");
  });

  it("distingue les communes concernées de celles ayant leur propre page", () => {
    const zone = regionFictive({ codesDept: ["31", "34"], parDept: [3, 1] });
    const textes = texteRegion(zone).paragraphes.join(" ");
    expect(textes).toContain("communes sont concernées, dont");
    expect(textes).toContain("en concentre le plus");
  });

  it("produit un texte différent pour deux régions aux chiffres différents", () => {
    // La garantie anti-gabarit : ce ne sont pas les mêmes phrases avec un nom changé.
    const [a, b] = getRegionsPubliees();
    expect(texteRegion(a).chapeau).not.toBe(texteRegion(b).chapeau);
    expect(texteRegion(a).paragraphes).not.toEqual(texteRegion(b).paragraphes);
  });
});

/* ───────────────────────── Chapeaux des pages d'index ───────────────────────── */

describe("texteIndexDepartements", () => {
  it("accorde tout au singulier pour un département unique", () => {
    const { chapeau } = texteIndexDepartements({
      departements: [deptFictif({ nbMissions: 1, codeDept: "33" })],
      nbRegions: 1,
    });
    expect(chapeau).toContain("1 département a sa propre page de missions d'orthoptie");
    expect(chapeau).toContain("soit 1 annonce toutes situées dans une même région");
    expect(chapeau).not.toContain("ont leur propre page");
  });

  it("accorde au pluriel et annonce la dispersion régionale", () => {
    const { chapeau } = texteIndexDepartements({
      departements: [
        deptFictif({ nbMissions: 3, codeDept: "33" }),
        deptFictif({ nbMissions: 2, codeDept: "31" }),
      ],
      nbRegions: 2,
    });
    expect(chapeau).toContain("2 départements ont leur propre page");
    expect(chapeau).toContain("soit 5 annonces réparties sur 2 régions");
  });

  it("classe les départements par volume dans l'analyse", () => {
    const { paragraphes } = texteIndexDepartements({
      departements: [
        deptFictif({ nbMissions: 2, codeDept: "33" }),
        deptFictif({ nbMissions: 6, codeDept: "31" }),
      ],
      nbRegions: 2,
    });
    expect(paragraphes[0]).toBe("Haute-Garonne (6) et Gironde (2) concentrent le plus d'annonces.");
  });
});

describe("texteIndexRegions", () => {
  it("accorde tout au singulier pour une région unique", () => {
    const { chapeau } = texteIndexRegions({ regions: [regionFictive({ codesDept: ["974"] })] });
    expect(chapeau).toContain("1 région a sa propre page de missions d'orthoptie");
    expect(chapeau).toContain("soit 1 annonce répartie sur 1 département");
  });

  it("emploie la locution de la région de tête, jamais un « en » plaqué", () => {
    const hautsDeFrance = regionFictive({ codesDept: ["59", "62"], parDept: [4, 2] });
    const occitanie = regionFictive({ codesDept: ["31", "34"], parDept: [1, 1] });
    const { paragraphes } = texteIndexRegions({ regions: [occitanie, hautsDeFrance] });
    expect(paragraphes[0]).toContain(
      "C'est dans les Hauts-de-France que les offres sont les plus nombreuses (6 sur 8).",
    );
    expect(paragraphes[0]).toContain("Suivent Occitanie (2).");
  });

  it("accorde la mention des régions sans page sur une seule entrée", () => {
    const { paragraphes } = texteIndexRegions({
      regions: [regionFictive({ codesDept: ["31", "34"] })],
      regionsSansPage: [{ nom: "Corse", count: 2 }],
    });
    const texte = paragraphes.join(" ");
    expect(texte).toContain("1 autre région ne compte qu'un seul département pourvu : Corse (2).");
    expect(texte).toContain("Sa page régionale ferait double emploi");
  });

  it("accorde la mention des régions sans page au pluriel", () => {
    const { paragraphes } = texteIndexRegions({
      regions: [regionFictive({ codesDept: ["31", "34"] })],
      regionsSansPage: [
        { nom: "Corse", count: 2 },
        { nom: "La Réunion", count: 1 },
      ],
    });
    const texte = paragraphes.join(" ");
    expect(texte).toContain("2 autres régions ne comptent qu'un seul département pourvu");
    expect(texte).toContain("Leurs pages régionales feraient double emploi");
  });
});

describe("texteIndexTypes", () => {
  it("accorde tout au singulier pour un type unique", () => {
    const { chapeau } = texteIndexTypes({
      types: [typeFictif({ nbMissions: 1, type: "Remplacement" })],
      nbDepartements: 1,
      nbCommunes: 1,
    });
    expect(chapeau).toContain("1 offre d'orthoptiste est recensée en France, toutes du même type");
    expect(chapeau).not.toContain("réparties en");
  });

  it("annonce la répartition en types au pluriel", () => {
    const { chapeau } = texteIndexTypes({
      types: [
        typeFictif({ nbMissions: 5, type: "Remplacement" }),
        typeFictif({ nbMissions: 2, type: "Association" }),
      ],
      nbDepartements: 3,
      nbCommunes: 9,
    });
    expect(chapeau).toContain("7 offres d'orthoptiste sont recensées en France, réparties en 2 types");
  });

  it("élide correctement le libellé du type dominant", () => {
    const { paragraphes } = texteIndexTypes({
      types: [
        typeFictif({ nbMissions: 5, type: "Association" }),
        typeFictif({ nbMissions: 2, type: "Remplacement" }),
      ],
      nbDepartements: 2,
      nbCommunes: 4,
    });
    expect(paragraphes[0]).toContain("Les offres d'association sont les plus nombreuses : 5 sur 7.");
    expect(paragraphes[0]).toContain("Viennent ensuite remplacement (2).");
  });

  it("accorde la couverture géographique sur un seul département et une seule commune", () => {
    const { paragraphes } = texteIndexTypes({
      types: [typeFictif({ nbMissions: 2, type: "Remplacement" })],
      nbDepartements: 1,
      nbCommunes: 1,
    });
    expect(paragraphes.join(" ")).toContain(
      "ces offres proviennent de 1 département et de 1 commune.",
    );
  });
});

/* ─────────── Qualité typographique sur toutes les zones réelles ─────────── */

describe("qualité typographique des textes réellement publiés", () => {
  const textes: { zone: string; texte: string }[] = [];

  /** Communes sous le seuil du département, telles que les pages les passent. */
  const communesDe = (codeDept: string) =>
    getCommunesSousLeSeuil(codeDept).map((c) => ({ nom: c.nom, count: c.missions.length }));

  for (const r of getRegionsPubliees()) {
    const { chapeau, paragraphes } = texteRegion(r);
    textes.push({ zone: `région ${r.slug}`, texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `région ${r.slug} §${i + 1}`, texte: p }));
  }

  for (const d of getDepartements()) {
    const { chapeau, paragraphes } = texteDepartement(d, communesDe(d.departement.code));
    textes.push({ zone: `département ${d.slug}`, texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `département ${d.slug} §${i + 1}`, texte: p }));
  }

  for (const v of getVilles()) {
    // `departement` est non optionnel sur ZoneVille : pas de branche de repli à tester ici.
    const total =
      getDepartements().find((d) => d.departement.code === v.departement.code)?.stats.total ?? v.stats.total;
    const { chapeau, paragraphes } = texteVille(v, total, communesDe(v.departement.code));
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

  {
    // L'index des villes est une page publiée comme les autres : son texte doit
    // passer les mêmes contrôles typographiques.
    const villes = getVilles();
    const communes = [...new Set(villes.map((v) => v.departement.code))].flatMap(communesDe);
    const { chapeau, paragraphes } = texteIndexVilles({
      villes,
      nbRegions: new Set(villes.map((v) => v.departement.region)).size,
      communesSansPage: communes,
    });
    textes.push({ zone: "index villes", texte: chapeau });
    paragraphes.forEach((p, i) => textes.push({ zone: `index villes §${i + 1}`, texte: p }));
  }

  {
    // Les trois autres index sont des pages publiées au même titre : leurs textes
    // sont écrits exactement comme les pages les appellent, données réelles comprises.
    const departements = getDepartements();
    const nbCommunes = departements.reduce((n, d) => n + d.nbVilles, 0);

    const index = [
      {
        zone: "index départements",
        ...texteIndexDepartements({
          departements,
          nbRegions: new Set(departements.map((d) => d.departement.region)).size,
        }),
      },
      {
        zone: "index régions",
        ...texteIndexRegions({
          regions: getRegionsPubliees(),
          regionsSansPage: getRegionsSansPage().map((r) => ({ nom: r.nom, count: r.stats.total })),
        }),
      },
      {
        zone: "index types",
        ...texteIndexTypes({
          types: getTypes(),
          nbDepartements: departements.length,
          nbCommunes,
        }),
      },
    ];

    for (const { zone, chapeau, paragraphes } of index) {
      textes.push({ zone, texte: chapeau });
      paragraphes.forEach((p, i) => textes.push({ zone: `${zone} §${i + 1}`, texte: p }));
    }
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

/**
 * Région forgée à partir de vrais codes de département : le premier code donne la
 * région, et `parDept` le nombre d'annonces de chacun. Permet de tester les
 * locutions irrégulières et les accords sans dépendre du contenu du jeu de données.
 */
function regionFictive({
  codesDept,
  parDept,
}: {
  codesDept: string[];
  parDept?: number[];
}): ZoneRegion {
  const departements = codesDept.map((code, i) =>
    deptFictif({ nbMissions: parDept?.[i] ?? 1, codeDept: code }),
  );
  const missions = departements.flatMap((d) => d.missions);
  const region = getRegion(getDepartement(codesDept[0])!.region)!;

  return {
    kind: "region",
    slug: region.nom.toLowerCase(),
    nom: region.nom,
    region,
    departements: [...departements].sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    villes: departements
      .flatMap((d) => d.villes)
      .sort((a, b) => b.missions.length - a.missions.length || a.nom.localeCompare(b.nom, "fr")),
    missions,
    stats: statsDe(missions),
    nbVilles: new Set(missions.map((m) => `${m.ville}|${m.codeDept}`)).size,
    publiee: departements.length >= 2,
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
