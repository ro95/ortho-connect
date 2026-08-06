import { describe, expect, it, vi, afterEach } from "vitest";

import * as geoReel from "./geo";
import { getMissions, type Mission } from "./missions";
import { slugify, SEUIL_REGION, SEUIL_VILLE } from "./geo";
import { REGIONS } from "./departements";

/**
 * Deux stratégies complémentaires :
 *
 * 1. Des INVARIANTS vérifiés contre les vraies données de `src/data/missions.json`.
 *    Robustes : ils restent vrais après chaque passage du scraper, alors qu'une
 *    valeur codée en dur casserait à la première collecte.
 * 2. Des CAS CIBLÉS sur un jeu de missions synthétique injecté via `vi.doMock`,
 *    parce que `geo.ts` construit ses index au chargement du module et qu'on ne
 *    peut donc pas lui passer des données autrement. Ces cas couvrent des
 *    situations (homonymes, seuil de publication) que les vraies données
 *    n'illustrent que partiellement.
 */

/* ─────────────────────────────── slugify ─────────────────────────────── */

describe("slugify", () => {
  it("retire les accents", () => {
    expect(slugify("Saint-Étienne")).toBe("saint-etienne");
    expect(slugify("Bègles")).toBe("begles");
    expect(slugify("Bécon-les-Bruyères")).toBe("becon-les-bruyeres");
  });

  it("traite l'apostrophe typographique et l'apostrophe droite de la même façon", () => {
    expect(slugify("L’Haÿ-les-Roses")).toBe("l-hay-les-roses");
    expect(slugify("L'Haÿ-les-Roses")).toBe("l-hay-les-roses");
    expect(slugify("L’Isle-Adam")).toBe(slugify("L'Isle-Adam"));
  });

  it("remplace la ponctuation diverse par un tiret unique", () => {
    expect(slugify("Aix-en-Provence (13)")).toBe("aix-en-provence-13");
    expect(slugify("Reims / Épernay")).toBe("reims-epernay");
    expect(slugify("Saint-Denis, La Réunion")).toBe("saint-denis-la-reunion");
  });

  it("réduit les espaces multiples à un seul tiret", () => {
    expect(slugify("Aix   en    Provence")).toBe("aix-en-provence");
    expect(slugify("Le  Mans")).toBe("le-mans");
  });

  it("nettoie les tirets en début et en fin", () => {
    expect(slugify("---Nantes---")).toBe("nantes");
    expect(slugify("  Nantes  ")).toBe("nantes");
    expect(slugify("'Nantes'")).toBe("nantes");
  });

  it("renvoie une chaîne vide pour une entrée vide ou sans caractère utile", () => {
    expect(slugify("")).toBe("");
    expect(slugify("   ")).toBe("");
    expect(slugify("--- ??? ---")).toBe("");
  });

  it("produit toujours un slug d'URL valide", () => {
    for (const entree of ["Saint-Étienne", "L’Haÿ-les-Roses", "Aix   en Provence", "Château-d'Œx"]) {
      expect(slugify(entree)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

/* ───────────────── Invariants sur les vraies données ────────────────── */

describe("index géographique — invariants sur les vraies données", () => {
  const missions = getMissions();
  const villes = geoReel.getVilles();
  const departements = geoReel.getDepartements();
  const types = geoReel.getTypes();

  it("le jeu de données n'est pas vide", () => {
    expect(missions.length).toBeGreaterThan(0);
    expect(villes.length).toBeGreaterThan(0);
    expect(departements.length).toBeGreaterThan(0);
  });

  it("aucun slug de ville n'est en double", () => {
    const slugs = villes.map((v) => v.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("aucun slug de département ni de type n'est en double", () => {
    expect(new Set(departements.map((d) => d.slug)).size).toBe(departements.length);
    expect(new Set(types.map((t) => t.slug)).size).toBe(types.length);
  });

  it("tous les slugs publiés sont des slugs d'URL valides", () => {
    for (const zone of [...villes, ...departements, ...types]) {
      expect(zone.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("toute ville publiée a au moins SEUIL_VILLE missions", () => {
    for (const v of villes) {
      expect(v.missions.length).toBeGreaterThanOrEqual(SEUIL_VILLE);
      expect(v.stats.total).toBe(v.missions.length);
    }
  });

  it("toute ville dont le nom de base est partagé entre départements porte un suffixe de département", () => {
    // Noms de base portés par plus d'un département dans les données brutes.
    const deptsParBase = new Map<string, Set<string>>();
    for (const m of missions) {
      if (!m.ville || !m.codeDept) continue;
      const base = slugify(m.ville);
      if (!base) continue;
      const vus = deptsParBase.get(base) ?? new Set<string>();
      vus.add(m.codeDept);
      deptsParBase.set(base, vus);
    }

    for (const v of villes) {
      const base = slugify(v.nom);
      const partage = (deptsParBase.get(base)?.size ?? 0) > 1;
      if (partage) {
        expect(v.slug).toBe(`${base}-${v.departement.code.toLowerCase()}`);
      } else {
        expect(v.slug).toBe(base);
      }
    }
  });

  it("le libellé affiché d'une ville est bien une des graphies collectées", () => {
    for (const v of villes) {
      const graphies = v.missions.map((m) => m.ville);
      expect(graphies).toContain(v.nom);
    }
  });

  it("les missions d'une ville appartiennent toutes à son département", () => {
    for (const v of villes) {
      for (const m of v.missions) expect(m.codeDept).toBe(v.departement.code);
    }
  });

  it("getVilleNonPubliee ne renvoie jamais une ville publiée", () => {
    for (const v of villes) {
      expect(geoReel.getVilleNonPubliee(v.slug)).toBeNull();
      expect(geoReel.getVilleBySlug(v.slug)).not.toBeNull();
    }
  });

  it("les missions de chaque zone sont triées de la plus récente à la plus ancienne", () => {
    for (const zone of [...villes, ...departements, ...types]) {
      const dates = zone.missions.map((m) => m.date);
      expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
    }
  });

  it("nbVilles compte des villes distinctes, pas des graphies distinctes", () => {
    for (const d of departements) {
      const distinctes = new Set(
        d.missions
          .map((m) => m.ville)
          .filter((v): v is string => Boolean(v))
          .map(slugify),
      ).size;
      expect({ dept: d.slug, nbVilles: d.nbVilles }).toEqual({ dept: d.slug, nbVilles: distinctes });
    }
  });

  it("la répartition par type d'une zone totalise le nombre de missions", () => {
    for (const zone of [...villes, ...departements, ...types]) {
      const somme = zone.stats.types.reduce((n, t) => n + t.count, 0);
      expect(somme).toBe(zone.stats.total);
    }
  });
});

/* ────────────────── Régions — invariants sur les vraies données ────────────────── */

describe("index régional — invariants sur les vraies données", () => {
  const regions = geoReel.getRegionsZones();
  const publiees = geoReel.getRegionsPubliees();
  const departements = geoReel.getDepartements();

  it("chaque région citée par la table des départements a une locution", () => {
    // Sans cette entrée, la page régionale afficherait une préposition manquante.
    for (const d of departements) {
      expect({ region: d.departement.region, connue: REGIONS.has(d.departement.region) }).toEqual({
        region: d.departement.region,
        connue: true,
      });
    }
  });

  it("aucun slug de région n'est en double et tous sont des slugs d'URL valides", () => {
    const slugs = regions.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const r of regions) expect(r.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("aucun slug de région n'entre en collision avec un slug de département", () => {
    // Les deux familles vivent sous des préfixes d'URL distincts, mais une collision
    // signalerait une agrégation qui confond les deux paliers.
    const slugsDept = new Set(departements.map((d) => d.slug));
    for (const r of regions) expect({ slug: r.slug, collision: slugsDept.has(r.slug) }).toEqual({
      slug: r.slug,
      collision: false,
    });
  });

  it("chaque département pourvu appartient à exactement une région", () => {
    const vus = regions.flatMap((r) => r.departements.map((d) => d.slug));
    expect(new Set(vus).size).toBe(vus.length);
    expect(new Set(vus)).toEqual(new Set(departements.map((d) => d.slug)));
  });

  it("la somme des missions des départements d'une région égale le total de la région", () => {
    for (const r of regions) {
      const somme = r.departements.reduce((n, d) => n + d.missions.length, 0);
      expect({ region: r.slug, somme }).toEqual({ region: r.slug, somme: r.stats.total });
      expect(r.missions).toHaveLength(r.stats.total);
    }
  });

  it("nbVilles régional égale la somme des nbVilles départementaux", () => {
    // Le comptage régional est fait par slug de ville et par département : deux
    // homonymes dans deux départements d'une même région restent deux communes.
    for (const r of regions) {
      const somme = r.departements.reduce((n, d) => n + d.nbVilles, 0);
      expect({ region: r.slug, nbVilles: r.nbVilles }).toEqual({ region: r.slug, nbVilles: somme });
    }
  });

  it("les villes liées par une région sont exactement les villes publiées de ses départements", () => {
    for (const r of regions) {
      const attendues = r.departements.flatMap((d) => d.villes.map((v) => v.slug)).sort();
      expect(r.villes.map((v) => v.slug).sort()).toEqual(attendues);
    }
  });

  it("seules les régions à plusieurs départements pourvus ont une page", () => {
    for (const r of regions) {
      expect({ region: r.slug, publiee: r.publiee }).toEqual({
        region: r.slug,
        publiee: r.departements.length >= SEUIL_REGION,
      });
    }
    expect(publiees).toEqual(regions.filter((r) => r.publiee));
  });

  it("getRegionBySlug et getRegionByNom ne renvoient que des régions publiées", () => {
    for (const r of regions) {
      const parSlug = geoReel.getRegionBySlug(r.slug);
      const parNom = geoReel.getRegionByNom(r.nom);
      expect({ slug: r.slug, trouve: parSlug !== null }).toEqual({ slug: r.slug, trouve: r.publiee });
      expect({ slug: r.slug, trouve: parNom !== null }).toEqual({ slug: r.slug, trouve: r.publiee });
    }
    expect(geoReel.getRegionBySlug("region-inexistante")).toBeNull();
  });

  it("les missions d'une région sont triées de la plus récente à la plus ancienne", () => {
    for (const r of regions) {
      const dates = r.missions.map((m) => m.date);
      expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
    }
  });
});

/* ─────────────── Communes sous le seuil de publication ─────────────── */

describe("getCommunesSousLeSeuil — invariants sur les vraies données", () => {
  const departements = geoReel.getDepartements();
  const villesPubliees = new Set(geoReel.getVilles().map((v) => v.slug));

  it("ne renvoie jamais une ville publiée", () => {
    for (const d of departements) {
      for (const c of geoReel.getCommunesSousLeSeuil(d.departement.code)) {
        expect({ commune: c.slug, publiee: villesPubliees.has(c.slug) }).toEqual({
          commune: c.slug,
          publiee: false,
        });
        expect(geoReel.getVilleBySlug(c.slug)).toBeNull();
      }
    }
  });

  it("ne renvoie que des communes strictement sous le seuil, dans le bon département", () => {
    for (const d of departements) {
      for (const c of geoReel.getCommunesSousLeSeuil(d.departement.code)) {
        expect(c.missions.length).toBeLessThan(SEUIL_VILLE);
        expect(c.departement.code).toBe(d.departement.code);
      }
    }
  });

  it("couvre, avec les villes publiées, toutes les communes nommées du département", () => {
    for (const d of departements) {
      const couvertes = new Set([
        ...d.villes.map((v) => slugify(v.nom)),
        ...geoReel.getCommunesSousLeSeuil(d.departement.code).map((c) => slugify(c.nom)),
      ]);
      const attendues = new Set(
        d.missions
          .map((m) => m.ville)
          .filter((v): v is string => Boolean(v))
          .map(slugify),
      );
      expect({ dept: d.slug, nb: couvertes.size }).toEqual({ dept: d.slug, nb: attendues.size });
      expect(couvertes).toEqual(attendues);
    }
  });

  it("renvoie une liste vide pour un département sans commune sous le seuil", () => {
    expect(geoReel.getCommunesSousLeSeuil("code-inexistant")).toEqual([]);
  });
});

/* ─────────────── Cas ciblés sur un jeu de données synthétique ─────────────── */

let compteur = 0;

function mission(partiel: Partial<Mission> & { ville: string | null; codeDept: string }): Mission {
  compteur += 1;
  return {
    id: `m-${compteur}`,
    date: "2026-08-01",
    departement: null,
    type: "Remplacement",
    structure: "Cabinet libéral",
    specialites: ["Réfraction"],
    resume: "Annonce de test.",
    contact: "email",
    ...partiel,
  };
}

async function chargerGeo(missions: Mission[]): Promise<typeof geoReel> {
  vi.resetModules();
  vi.doMock("./missions", async () => {
    const reel = await vi.importActual<typeof import("./missions")>("./missions");
    return { ...reel, getMissions: () => missions };
  });
  return import("./geo");
}

afterEach(() => {
  vi.doUnmock("./missions");
  vi.resetModules();
});

describe("déduplication des graphies de ville", () => {
  const jeu = [
    mission({ ville: "Saint Etienne", codeDept: "42" }),
    mission({ ville: "Saint-Étienne", codeDept: "42" }),
    mission({ ville: "Saint-Étienne", codeDept: "42" }),
    mission({ ville: "saint étienne", codeDept: "42" }),
  ];

  it("réunit toutes les graphies d'un même lieu en une seule zone", async () => {
    const geo = await chargerGeo(jeu);
    const villes = geo.getVilles();
    expect(villes).toHaveLength(1);
    expect(villes[0].slug).toBe("saint-etienne");
    expect(villes[0].missions).toHaveLength(4);
  });

  it("affiche la graphie majoritaire", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilles()[0].nom).toBe("Saint-Étienne");
  });

  it("produit un libellé stable d'un build à l'autre, même à égalité de graphies", async () => {
    // Égalité parfaite 2/2 : c'est le tri de départage qui doit trancher, et il
    // doit trancher pareil quel que soit l'ordre d'arrivée des annonces.
    const ordreA = [
      mission({ ville: "Saint Etienne", codeDept: "42" }),
      mission({ ville: "Saint-Étienne", codeDept: "42" }),
      mission({ ville: "Saint Etienne", codeDept: "42" }),
      mission({ ville: "Saint-Étienne", codeDept: "42" }),
    ];
    const ordreB = [ordreA[1], ordreA[3], ordreA[0], ordreA[2]];

    const nomA = (await chargerGeo(ordreA)).getVilles()[0].nom;
    const nomB = (await chargerGeo(ordreB)).getVilles()[0].nom;
    const nomA2 = (await chargerGeo(ordreA)).getVilles()[0].nom;

    expect(nomA).toBe(nomA2);
    expect(nomA).toBe(nomB);
    expect(["Saint Etienne", "Saint-Étienne"]).toContain(nomA);
  });
});

describe("désambiguïsation des homonymes", () => {
  const jeu = [
    mission({ ville: "Vienne", codeDept: "38" }),
    mission({ ville: "Vienne", codeDept: "38" }),
    mission({ ville: "Vienne", codeDept: "86" }),
    mission({ ville: "Vienne", codeDept: "86" }),
    mission({ ville: "Toulouse", codeDept: "31" }),
    mission({ ville: "Toulouse", codeDept: "31" }),
  ];

  it("donne deux slugs distincts suffixés du code département", async () => {
    const geo = await chargerGeo(jeu);
    const slugs = geo.getVilles().map((v) => v.slug).sort();
    expect(slugs).toEqual(["toulouse", "vienne-38", "vienne-86"]);
  });

  it("rattache chaque homonyme au bon département", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilleBySlug("vienne-38")?.departement.nom).toBe("Isère");
    expect(geo.getVilleBySlug("vienne-86")?.departement.nom).toBe("Vienne");
    expect(geo.getVilleBySlug("vienne")).toBeNull();
  });

  it("ne suffixe pas les villes sans homonyme", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilleBySlug("toulouse")?.nom).toBe("Toulouse");
  });

  it("ne fusionne pas les missions de deux homonymes", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilleBySlug("vienne-38")?.missions).toHaveLength(2);
    expect(geo.getVilleBySlug("vienne-86")?.missions).toHaveLength(2);
  });
});

describe("seuil de publication des villes", () => {
  const jeu = [
    mission({ ville: "Bordeaux", codeDept: "33" }),
    mission({ ville: "Bordeaux", codeDept: "33" }),
    mission({ ville: "Pessac", codeDept: "33" }),
  ];

  it("SEUIL_VILLE vaut au moins 2 : une ville isolée ne mérite pas de page", () => {
    expect(SEUIL_VILLE).toBeGreaterThanOrEqual(2);
  });

  it("exclut de getVilles() une ville sous le seuil", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilles().map((v) => v.slug)).toEqual(["bordeaux"]);
    expect(geo.getVilleBySlug("pessac")).toBeNull();
  });

  it("garde la ville sous le seuil retrouvable via getVilleNonPubliee", async () => {
    const geo = await chargerGeo(jeu);
    const pessac = geo.getVilleNonPubliee("pessac");
    expect(pessac).not.toBeNull();
    expect(pessac?.nom).toBe("Pessac");
    expect(pessac?.departement.code).toBe("33");
  });

  it("ne renvoie jamais une ville publiée via getVilleNonPubliee", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getVilleNonPubliee("bordeaux")).toBeNull();
    expect(geo.getVilleNonPubliee("slug-inexistant")).toBeNull();
  });

  it("les missions d'une ville sous le seuil restent visibles sur la page du département", async () => {
    const geo = await chargerGeo(jeu);
    const dept = geo.getDepartementByCode("33");
    expect(dept?.missions).toHaveLength(3);
    expect(dept?.villes.map((v) => v.slug)).toEqual(["bordeaux"]);
  });

  it("expose la ville sous le seuil via getCommunesSousLeSeuil, sans la ville publiée", async () => {
    const geo = await chargerGeo(jeu);
    const communes = geo.getCommunesSousLeSeuil("33");
    expect(communes.map((c) => c.nom)).toEqual(["Pessac"]);
    expect(communes[0].missions).toHaveLength(1);
  });
});

describe("agrégation régionale", () => {
  // Occitanie (31, 34) et Nouvelle-Aquitaine (33) : deux régions, dont une à
  // département unique, plus deux homonymes répartis dans une même région.
  const jeu = [
    mission({ ville: "Toulouse", codeDept: "31" }),
    mission({ ville: "Toulouse", codeDept: "31" }),
    mission({ ville: "Castelnau", codeDept: "31" }),
    mission({ ville: "Castelnau", codeDept: "34" }),
    mission({ ville: "Montpellier", codeDept: "34" }),
    mission({ ville: "Montpellier", codeDept: "34" }),
    mission({ ville: "Bordeaux", codeDept: "33" }),
    mission({ ville: "Bordeaux", codeDept: "33" }),
  ];

  it("regroupe les départements sous leur région et totalise leurs missions", async () => {
    const geo = await chargerGeo(jeu);
    const occitanie = geo.getRegionsZones().find((r) => r.slug === "occitanie");
    expect(occitanie?.departements.map((d) => d.departement.code).sort()).toEqual(["31", "34"]);
    expect(occitanie?.stats.total).toBe(6);
  });

  it("compte les homonymes de deux départements comme deux communes", async () => {
    const geo = await chargerGeo(jeu);
    const occitanie = geo.getRegionsZones().find((r) => r.slug === "occitanie");
    // Castelnau (31) et Castelnau (34) : un comptage par nom seul en verrait une.
    expect(occitanie?.nbVilles).toBe(4);
  });

  it("ne publie pas de page pour une région à département unique", async () => {
    const geo = await chargerGeo(jeu);
    const aquitaine = geo.getRegionsZones().find((r) => r.slug === "nouvelle-aquitaine");
    expect(aquitaine?.publiee).toBe(false);
    expect(geo.getRegionBySlug("nouvelle-aquitaine")).toBeNull();
    expect(geo.getRegionByNom("Nouvelle-Aquitaine")).toBeNull();
    expect(geo.getRegionsPubliees().map((r) => r.slug)).toEqual(["occitanie"]);
  });

  it("garde la région non publiée dans l'annuaire, pour ne perdre aucun département", async () => {
    const geo = await chargerGeo(jeu);
    expect(geo.getRegionsZones().map((r) => r.slug).sort()).toEqual([
      "nouvelle-aquitaine",
      "occitanie",
    ]);
  });
});
