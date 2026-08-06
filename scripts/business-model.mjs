#!/usr/bin/env node
/**
 * Projection 12 mois des modèles économiques Ortho-Connect.
 *
 * Trois scénarios comparés sur le même flux de mises en relation :
 *   A — Forfait  : honoraires one-shot à la signature du contrat.
 *   B — Récurrent: marge d'intermédiation sur le TJM, facturée au mois.
 *   C — Mix      : répartition réelle des annonces collectées (voir MIX).
 *
 * Usage : npm run model [nbMois]   (défaut 12)
 */

// ---------------------------------------------------------------------------
// Hypothèses — tout est ici, rien n'est codé en dur plus bas.
// ---------------------------------------------------------------------------

const MOIS = Number(process.argv[2]) || 12;

/** Mandats entreprise signés par mois. Au-delà de la rampe, on tient le rythme de croisière. */
const RAMPE = [2, 3, 4, 5, 6, 7, 8, 8, 9, 9, 10, 10];
const MANDATS_PAR_MOIS = Array.from({ length: MOIS }, (_, m) => RAMPE[m] ?? RAMPE[RAMPE.length - 1]);

/** Part des mandats qui aboutissent effectivement à une signature. */
const TAUX_REMPLISSAGE = 0.55;

/** Délai en mois entre la signature du mandat et la signature du contrat. */
const DELAI_MOIS = 1;

/** Charge de travail réelle par placement abouti, en heures (qualif + appels + relances + suivi). */
const HEURES_PAR_PLACEMENT = 6;
/** Heures utiles disponibles par mois (mi-temps téléphonique). */
const HEURES_DISPO_PAR_MOIS = 70;

/** Scénario A — forfait. */
const FORFAIT = {
  prixLancement: 2500,
  nbLancement: 20, // les 20 premiers placements au tarif early adopter
  prixNormal: 3500,
};

/** Scénario B — marge sur missions récurrentes. */
const RECURRENT = {
  tjm: 300,
  joursParMois: 13, // ~3 jours/semaine
  taux: 0.15,
  dureeMoyenneMois: 9,
  /** Probabilité qu'une mission s'arrête prématurément, par mois. */
  churnMensuel: 0.06,
};

/** Scénario C — mix observé dans src/data/missions.json (293 annonces). */
const MIX = { placement: 0.38, recurrent: 0.62 };

/** Délai moyen d'encaissement, en mois (forfait = à la signature, récurrent = facturation M+1). */
const ENCAISSEMENT = { forfait: 0, recurrent: 1 };

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

const eur = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const pad = (s, n, right = true) => (right ? String(s).padStart(n) : String(s).padEnd(n));

/** Placements aboutis par mois, avant plafond de capacité. */
function placementsBruts() {
  return Array.from({ length: MOIS }, (_, m) => {
    const source = MANDATS_PAR_MOIS[m - DELAI_MOIS];
    return source === undefined ? 0 : source * TAUX_REMPLISSAGE;
  });
}

/** Applique le plafond de capacité : au-delà, le travail ne peut pas être absorbé. */
function placements() {
  const plafond = HEURES_DISPO_PAR_MOIS / HEURES_PAR_PLACEMENT;
  const bruts = placementsBruts();
  return bruts.map((p) => ({ retenus: Math.min(p, plafond), perdus: Math.max(0, p - plafond) }));
}

/** Scénario A — chiffre d'affaires forfaitaire, reconnu au mois du placement. */
function scenarioForfait(flux) {
  let cumul = 0;
  return flux.map(({ retenus }) => {
    let ca = 0;
    // Le tarif de lancement s'épuise au fil des placements cumulés.
    const restantLancement = Math.max(0, FORFAIT.nbLancement - cumul);
    const auLancement = Math.min(retenus, restantLancement);
    ca += auLancement * FORFAIT.prixLancement;
    ca += (retenus - auLancement) * FORFAIT.prixNormal;
    cumul += retenus;
    return ca;
  });
}

/**
 * Scénario B — marge récurrente. Chaque placement ouvre une mission qui génère
 * une marge mensuelle jusqu'à son terme, avec attrition.
 */
function scenarioRecurrent(flux) {
  const margeMensuelle = RECURRENT.tjm * RECURRENT.joursParMois * RECURRENT.taux;
  const ca = Array(MOIS).fill(0);
  const actives = Array(MOIS).fill(0);

  flux.forEach(({ retenus }, debut) => {
    let vivantes = retenus;
    for (let m = debut; m < MOIS && m - debut < RECURRENT.dureeMoyenneMois; m++) {
      if (m > debut) vivantes *= 1 - RECURRENT.churnMensuel;
      ca[m] += vivantes * margeMensuelle;
      actives[m] += vivantes;
    }
  });

  return { ca, actives, margeMensuelle };
}

/** Scénario C — chaque placement suit l'un ou l'autre modèle selon le mix. */
function scenarioMix(flux) {
  const fluxPlacement = flux.map(({ retenus }) => ({ retenus: retenus * MIX.placement }));
  const fluxRecurrent = flux.map(({ retenus }) => ({ retenus: retenus * MIX.recurrent }));
  const a = scenarioForfait(fluxPlacement);
  const b = scenarioRecurrent(fluxRecurrent);
  return { ca: a.map((v, i) => v + b.ca[i]), actives: b.actives };
}

/** Décale le CA pour obtenir l'encaissement réel. */
function encaisse(ca, delai) {
  return ca.map((_, m) => (m - delai < 0 ? 0 : ca[m - delai]));
}

const somme = (t) => t.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
// Sortie
// ---------------------------------------------------------------------------

const flux = placements();
const forfait = scenarioForfait(flux);
const recurrent = scenarioRecurrent(flux);
const mix = scenarioMix(flux);

console.log("\n=== ORTHO-CONNECT — projection 12 mois ===\n");
console.log(
  `Hypothèses : ${(TAUX_REMPLISSAGE * 100).toFixed(0)}% de remplissage, ${DELAI_MOIS} mois de délai, ` +
    `capacité ${(HEURES_DISPO_PAR_MOIS / HEURES_PAR_PLACEMENT).toFixed(1)} placements/mois.`,
);
console.log(
  `Forfait ${eur(FORFAIT.prixNormal)} (${FORFAIT.nbLancement} premiers à ${eur(FORFAIT.prixLancement)}) | ` +
    `Récurrent ${RECURRENT.taux * 100}% × ${RECURRENT.tjm}€ × ${RECURRENT.joursParMois}j = ` +
    `${eur(recurrent.margeMensuelle)}/mois pendant ${RECURRENT.dureeMoyenneMois} mois.\n`,
);

const cols = ["Mois", "Plact", "A/mois", "A cumul", "B/mois", "B cumul", "C/mois", "C cumul", "Miss.act"];
const largeurs = [5, 6, 9, 10, 9, 10, 9, 10, 9];
console.log(cols.map((c, i) => pad(c, largeurs[i])).join(" "));
console.log(largeurs.map((l) => "─".repeat(l)).join(" "));

let ca = [0, 0, 0];
for (let m = 0; m < MOIS; m++) {
  ca = [ca[0] + forfait[m], ca[1] + recurrent.ca[m], ca[2] + mix.ca[m]];
  const ligne = [
    `M${m + 1}`,
    flux[m].retenus.toFixed(1),
    eur(forfait[m]),
    eur(ca[0]),
    eur(recurrent.ca[m]),
    eur(ca[1]),
    eur(mix.ca[m]),
    eur(ca[2]),
    recurrent.actives[m].toFixed(1),
  ];
  console.log(ligne.map((v, i) => pad(v, largeurs[i])).join(" "));
}

console.log(`\n--- Bilan à ${MOIS} mois ---`);
const totalPlacements = somme(flux.map((f) => f.retenus));
const totalPerdus = somme(flux.map((f) => f.perdus));
console.log(`Placements aboutis        : ${totalPlacements.toFixed(0)}`);
if (totalPerdus > 0.05) {
  console.log(`Placements PERDUS (capacité): ${totalPerdus.toFixed(1)} — plafond atteint, il faut recruter`);
}
console.log(`A — Forfait               : ${eur(somme(forfait))}`);
console.log(`B — Récurrent             : ${eur(somme(recurrent.ca))}`);
console.log(`C — Mix réel (38/62)      : ${eur(somme(mix.ca))}`);

console.log(`\n--- Trésorerie encaissée à ${MOIS} mois ---`);
console.log(`A — encaissé (M+${ENCAISSEMENT.forfait})          : ${eur(somme(encaisse(forfait, ENCAISSEMENT.forfait)))}`);
console.log(`B — encaissé (M+${ENCAISSEMENT.recurrent})          : ${eur(somme(encaisse(recurrent.ca, ENCAISSEMENT.recurrent)))}`);
console.log(`C — encaissé              : ${eur(somme(encaisse(mix.ca, ENCAISSEMENT.recurrent)))}`);

console.log(`\n--- Run-rate sortie de M${MOIS} (× 12) ---`);
console.log(`A : ${eur(forfait[MOIS - 1] * 12)}   (s'arrête si tu arrêtes de vendre)`);
console.log(`B : ${eur(recurrent.ca[MOIS - 1] * 12)}   (${recurrent.actives[MOIS - 1].toFixed(0)} missions actives portent ce revenu)`);
console.log(`C : ${eur(mix.ca[MOIS - 1] * 12)}\n`);

/** Mois où le récurrent dépasse durablement le forfait. */
const bascule = recurrent.ca.findIndex((v, i) => v > forfait[i] && recurrent.ca.slice(i).every((x, j) => x > forfait[i + j]));
console.log(bascule === -1
  ? "Le récurrent ne dépasse pas le forfait sur 12 mois.\n"
  : `Bascule : le récurrent dépasse le forfait à partir de M${bascule + 1} et ne repasse plus dessous.\n`);
