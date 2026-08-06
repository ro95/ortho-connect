#!/usr/bin/env node
/**
 * Calibration de la grille tarifaire Ortho-Connect.
 *
 * Le forfait unique se trompe parce que les missions n'ont pas toutes la même
 * durée. Ce script part d'une distribution réaliste de durées par type de
 * mission (pondérée par le volume réel de src/data/missions.json) et compare
 * plusieurs grilles sur trois critères :
 *   - ce que TU encaisses par mission
 *   - ce que le CLIENT paie en plus (test d'acceptabilité)
 *   - ton revenu par heure travaillée (test de viabilité)
 *
 * Convention : la marge est prélevée EN SUS du TJM. Le professionnel touche son
 * TJM plein, le client paie TJM x (1 + taux). C'est le modèle le plus lisible
 * et le seul qui ne fait pas baisser la rému du pro.
 *
 * Usage : npm run pricing
 */

// ---------------------------------------------------------------------------
// Marché — volumes réels observés dans les 293 annonces collectées.
// ---------------------------------------------------------------------------

/**
 * Pour chaque type : volume observé, TJM, jours/mois, et distribution de durées
 * [duréeEnMois, probabilité]. Les distributions sont les hypothèses à challenger.
 */
const TYPES = [
  {
    nom: "Remplacement",
    volume: 51,
    recurrent: true,
    tjm: 320, // prime d'urgence
    joursParMois: 13,
    durees: [[0.5, 0.35], [1, 0.30], [2, 0.20], [3, 0.10], [6, 0.05]],
  },
  {
    nom: "Collaboration",
    volume: 85,
    recurrent: true,
    tjm: 300,
    joursParMois: 15,
    durees: [[6, 0.15], [12, 0.30], [24, 0.30], [36, 0.25]],
  },
  {
    nom: "Mission",
    volume: 40,
    recurrent: true,
    tjm: 300,
    joursParMois: 10,
    durees: [[1, 0.30], [3, 0.35], [6, 0.25], [12, 0.10]],
  },
  {
    nom: "Salariat",
    volume: 106,
    recurrent: false,
    salaireBrutAnnuel: 36000,
  },
  { nom: "Association", volume: 4, recurrent: false, salaireBrutAnnuel: 45000 },
  { nom: "Cession", volume: 2, recurrent: false, salaireBrutAnnuel: 45000 },
];

/** Heures de travail réelles pour aboutir à UN placement (mandats ratés inclus). */
const HEURES_PAR_PLACEMENT = 6 / 0.55;

// ---------------------------------------------------------------------------
// Grilles testées sur les missions récurrentes.
// ---------------------------------------------------------------------------

/** Chaque grille renvoie ce que tu encaisses pour une mission de `duree` mois. */
const GRILLES = [
  {
    nom: "G1 · 15 % à vie",
    calc: (m, duree) => m * 0.15 * duree,
    desc: "simple, mais 0 plancher et 0 plafond",
  },
  {
    nom: "G2 · 15 % + plancher 900 €",
    calc: (m, duree) => Math.max(900, m * 0.15 * duree),
    desc: "le plancher couvre le travail sur les missions courtes",
  },
  {
    nom: "G3 · 15 % plafonné 12 mois",
    calc: (m, duree) => m * 0.15 * Math.min(duree, 12),
    desc: "au-delà d'un an, le client est libéré",
  },
  {
    nom: "G4 · plancher 900 € + 15 % plafonné 12 mois",
    calc: (m, duree) => Math.max(900, m * 0.15 * Math.min(duree, 12)),
    desc: "combine les deux garde-fous",
    recommandee: true,
  },
  {
    nom: "G5 · dégressif 18/12/6 %",
    calc: (m, duree) =>
      m * (0.18 * Math.min(duree, 6) +
           0.12 * Math.min(Math.max(duree - 6, 0), 6) +
           0.06 * Math.max(duree - 12, 0)),
    desc: "front-load : tu encaisses vite, le client voit le tarif baisser",
  },
];

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

const eur = (n) => Math.round(n).toLocaleString("fr-FR") + " €";
const pad = (s, n) => String(s).padStart(n);
const padL = (s, n) => String(s).padEnd(n);

const recurrents = TYPES.filter((t) => t.recurrent);
const volumeRecurrent = recurrents.reduce((a, t) => a + t.volume, 0);

/** Espérance de gain d'une grille sur un type de mission donné. */
function esperance(type, grille) {
  const margeMensuelle = type.tjm * type.joursParMois; // base 100 %, la grille applique le taux
  return type.durees.reduce((acc, [duree, proba]) => acc + proba * grille.calc(margeMensuelle, duree), 0);
}

/** Durée moyenne pondérée, pour contextualiser. */
function dureeMoyenne(type) {
  return type.durees.reduce((a, [d, p]) => a + d * p, 0);
}

console.log("\n=== GRILLE TARIFAIRE — missions récurrentes ===\n");
console.log("Encaissement moyen par mission, par type :\n");

const largeur = 38;
console.log(padL("Grille", largeur) + recurrents.map((t) => pad(t.nom, 15)).join("") + pad("Moy. pondérée", 16) + pad("€/heure", 10));
console.log("─".repeat(largeur + recurrents.length * 15 + 26));

const resultats = [];
for (const grille of GRILLES) {
  const parType = recurrents.map((t) => esperance(t, grille));
  const moyenne = recurrents.reduce((a, t, i) => a + (t.volume / volumeRecurrent) * parType[i], 0);
  resultats.push({ grille, parType, moyenne });
  console.log(
    padL(grille.nom + (grille.recommandee ? " ★" : ""), largeur) +
      parType.map((v) => pad(eur(v), 15)).join("") +
      pad(eur(moyenne), 16) +
      pad(eur(moyenne / HEURES_PAR_PLACEMENT), 10),
  );
}

console.log("\nDurées moyennes retenues : " + recurrents.map((t) => `${t.nom} ${dureeMoyenne(t).toFixed(1)} mois`).join(" · "));

// ---------------------------------------------------------------------------
// Test d'acceptabilité client : surcoût sur la mission la plus longue.
// ---------------------------------------------------------------------------

console.log("\n=== ACCEPTABILITÉ CLIENT — surcoût sur une collaboration de 36 mois ===\n");
const collab = recurrents.find((t) => t.nom === "Collaboration");
const coutBrutClient = collab.tjm * collab.joursParMois * 36;
console.log(`Coût du professionnel pour le client sur 36 mois : ${eur(coutBrutClient)}\n`);
console.log(padL("Grille", largeur) + pad("Tes honoraires", 18) + pad("% du coût total", 18));
console.log("─".repeat(largeur + 36));
for (const { grille } of resultats) {
  const h = grille.calc(collab.tjm * collab.joursParMois, 36);
  console.log(padL(grille.nom, largeur) + pad(eur(h), 18) + pad((100 * h / coutBrutClient).toFixed(1) + " %", 18));
}
console.log("\n> Au-delà de ~5 % du coût total, le client a un intérêt financier net à te contourner.");

// ---------------------------------------------------------------------------
// Missions courtes : le plancher est-il justifié ?
// ---------------------------------------------------------------------------

console.log("\n=== MISSIONS COURTES — le test du remplacement de 2 semaines ===\n");
const remp = recurrents.find((t) => t.nom === "Remplacement");
const margeRemp = remp.tjm * remp.joursParMois;
console.log(padL("Grille", largeur) + pad("Encaissé", 14) + pad("€/heure", 12) + pad("Viable ?", 12));
console.log("─".repeat(largeur + 38));
for (const { grille } of resultats) {
  const h = grille.calc(margeRemp, 0.5);
  const parHeure = h / HEURES_PAR_PLACEMENT;
  console.log(
    padL(grille.nom, largeur) + pad(eur(h), 14) + pad(eur(parHeure), 12) +
      pad(parHeure >= 60 ? "oui" : "NON", 12),
  );
}
console.log("\n> Seuil de viabilité fixé à 60 €/heure travaillée (coût chargé + marge).");

// ---------------------------------------------------------------------------
// Forfaits sur les placements définitifs.
// ---------------------------------------------------------------------------

console.log("\n=== FORFAITS — placements définitifs (salariat, association, cession) ===\n");
const PALIERS = [
  { label: "< 32 k€ brut/an", salaire: 30000 },
  { label: "32–40 k€ brut/an", salaire: 36000 },
  { label: "> 40 k€ brut/an", salaire: 45000 },
];
console.log(padL("Palier", 22) + pad("Forfait proposé", 18) + pad("% du brut", 12) + pad("Cabinet (18 %)", 16));
console.log("─".repeat(68));
for (const p of PALIERS) {
  // Forfait calé sur ~10 % du brut, arrondi au demi-millier : lisible et 2x moins cher qu'un cabinet.
  const forfait = Math.round((p.salaire * 0.10) / 500) * 500;
  console.log(
    padL(p.label, 22) + pad(eur(forfait), 18) +
      pad((100 * forfait / p.salaire).toFixed(1) + " %", 12) +
      pad(eur(p.salaire * 0.18), 16),
  );
}
console.log("\n> Le forfait reste ~2x moins cher qu'un cabinet de recrutement : c'est l'argument de vente.\n");
