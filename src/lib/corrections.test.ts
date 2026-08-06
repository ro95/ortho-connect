import { describe, expect, it } from "vitest";
import { CORRECTIONS_VILLE, corrigerVille } from "./corrections";
import { getMissions } from "./missions";
import { getVilleBySlug, getVilleNonPubliee, slugify } from "./geo";

describe("corrections de communes", () => {
  it("laisse passer les valeurs non corrigées", () => {
    expect(corrigerVille("Toulouse", "31")).toBe("Toulouse");
    expect(corrigerVille(null, "31")).toBeNull();
  });

  it("ne corrige que dans le bon département", () => {
    const [c] = CORRECTIONS_VILLE;
    expect(corrigerVille(c.de, c.codeDept)).toBe(c.vers);
    expect(corrigerVille(c.de, "99")).toBe(c.de);
  });

  it("applique les corrections aux données servies", () => {
    const villes = new Set(getMissions().map((m) => m.ville));
    for (const { de, vers } of CORRECTIONS_VILLE) {
      expect(villes.has(de), `« ${de} » ne devrait plus être servie`).toBe(false);
      expect(villes.has(vers), `« ${vers} » devrait être servie`).toBe(true);
    }
  });

  it("aucune valeur servie ne ressemble à une raison sociale", () => {
    const suspect = /(Clinique|Polyclinique|Direction|Service|Ville de|Centre Hospitalier|Hôpital|EHPAD|Institut|Fondation)/i;
    const villes = [...new Set(getMissions().map((m) => m.ville).filter(Boolean))];
    expect(villes.filter((v) => suspect.test(v!))).toEqual([]);
  });

  it("aucune valeur servie ne commence par un repère approximatif", () => {
    const repere = /^(Nord|Sud|Est|Ouest|Proche|Près|Environs|Alentours|Périphérie|Région|Secteur|Agglomération)\b/i;
    const villes = [...new Set(getMissions().map((m) => m.ville).filter(Boolean))];
    expect(villes.filter((v) => repere.test(v!))).toEqual([]);
  });

  it("la commune corrigée est bien rattachée à une zone", () => {
    for (const { vers } of CORRECTIONS_VILLE) {
      const slug = slugify(vers);
      // Selon son volume d'annonces, la commune a sa page ou reste sous le seuil —
      // dans les deux cas l'index doit la connaître, jamais l'ignorer.
      expect(
        getVilleBySlug(slug) ?? getVilleNonPubliee(slug),
        `« ${vers} » (${slug}) est introuvable dans l'index`,
      ).not.toBeNull();
    }
  });
});
