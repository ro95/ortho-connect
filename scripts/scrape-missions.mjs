/**
 * Scrape les annonces d'orthoptie.net et produit deux fichiers :
 *
 *  - data/leads.json          → PRIVÉ (emails + téléphones + texte complet). Jamais importé côté client.
 *  - src/data/missions.json   → PUBLIC (ville, département, type, date, résumé court). Zéro donnée de contact.
 *
 * Usage : node scripts/scrape-missions.mjs
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const SOURCES = [
  { url: "https://orthoptie.net/annonces/proposition.htm", categorie: "offre" },
];

/* ────────────────────────── utils ────────────────────────── */

const ENTITIES = {
  nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", ccedil: "ç",
  ocirc: "ô", ucirc: "û", ugrave: "ù", icirc: "î", iuml: "ï", euml: "ë",
  acirc: "â", ntilde: "ñ", laquo: "«", raquo: "»", deg: "°", euro: "€",
  rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", ndash: "–", mdash: "—",
};

function decodeEntities(s) {
  return s
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? m);
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/* ─────────────────────── extraction ──────────────────────── */

const DEPT_WITH_NAME = /\(\s*([A-Za-zÀ-ÿ'’\- ]{3,40}?)\s*[-–—]\s*(\d{2,3}|2[AB])\s*\)/;
const DEPT_ALONE = /([A-ZÀ-Ý][A-Za-zÀ-ÿ'’\-]*(?:[ -](?:[A-ZÀ-Ý][A-Za-zÀ-ÿ'’\-]*|et|de|du|des|le|la|les))*)\s*\(\s*(\d{2,3}|2[AB])\s*\)/;

function extractLieu(texte) {
  let m = texte.match(DEPT_WITH_NAME);
  let departement = null;
  let code = null;
  let idx = -1;

  if (m) {
    departement = m[1].trim();
    code = m[2];
    idx = m.index;
  } else {
    m = texte.match(DEPT_ALONE);
    if (m) {
      departement = m[1].trim();
      code = m[2];
      idx = m.index;
    }
  }
  if (!m) return { ville: null, departement: null, code: null };

  // La ville se trouve en général juste avant la parenthèse du département.
  const avant = texte.slice(Math.max(0, idx - 70), idx).trim().replace(/[,\s]+$/, "");
  const ville = extraireVille(avant);

  return { ville, departement, code };
}

/*
 * Le lookbehind devant le groupe de prépositions est indispensable : sans lui,
 * l'alternative « a » matche le « a » final de n'importe quel mot — « L(a) Direction
 * de la Petite Enfance de la Ville de Lyon », « pour l(a) Clinique Mutualiste de Saint
 * Etienne » — et le motif avale alors la raison sociale entière en guise de commune.
 *
 * Un `\b` ne conviendrait pas : en JavaScript la frontière de mot est ASCII, il n'y en
 * a donc aucune entre une espace et « à », ce qui écarterait tous les « à Bordeaux ».
 */
const CANDIDAT_VILLE =
  /(?<![A-Za-zÀ-ÿ'’])(?:à|a|au|aux|sur|proche de|près de|de)\s+([A-ZÀ-Ý][A-Za-zÀ-ÿ'’]*(?:[ -](?:[A-ZÀ-Ý][A-Za-zÀ-ÿ'’]*|[dl]['’][A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’]*|les|le|la|des|du|de|sous|sur|lès|en))*)(?![A-Za-zÀ-ÿ])/g;

/**
 * Repères approximatifs, pas des communes. « au Nord de Toulouse » désigne une zone,
 * et la vraie commune est écrite ailleurs dans la phrase.
 */
const REPERE_APPROXIMATIF =
  /^(Nord|Sud|Est|Ouest|Centre|Proche|Près|Environs|Alentours|Périphérie|Région|Secteur|Agglomération)\b/i;

/**
 * On préfère le candidat collé à la parenthèse du département, et le plus long à
 * cette position — sans quoi « à Fort de France » se réduirait à « France ».
 *
 * Si ce candidat n'est qu'un repère approximatif, on écarte aussi tous ceux qui le
 * chevauchent — « Toulouse » extrait de « Nord de Toulouse » serait la même erreur —
 * et on retombe sur le candidat valide précédent, qui est la commune réelle.
 */
function extraireVille(avant) {
  const candidats = [...avant.matchAll(CANDIDAT_VILLE)]
    .map((m) => ({ nom: m[1].trim(), debut: m.index, fin: m.index + m[0].length }))
    .sort((a, b) => b.fin - a.fin || a.debut - b.debut);

  for (let i = 0; i < candidats.length; i++) {
    const c = candidats[i];
    if (!REPERE_APPROXIMATIF.test(c.nom)) return c.nom;
    // Candidat rejeté : on saute ceux qu'il chevauche — eux seuls, un candidat
    // entièrement à sa gauche reste la meilleure réponse disponible.
    while (i + 1 < candidats.length && candidats[i + 1].fin > c.debut) i++;
  }

  return null;
}

const TYPES = [
  { type: "Remplacement", re: /rempla[çc]/i },
  { type: "Collaboration", re: /collabora/i },
  { type: "Assistanat", re: /assistan/i },
  { type: "Association", re: /associ[ée]|association/i },
  { type: "Cession", re: /c[èe]de|cession|vend(?:s|re)?\s|reprise de patient/i },
  { type: "Salariat", re: /CDI|CDD|salari[ée]|vacation/i },
  { type: "Stage", re: /stagiaire|stage/i },
];

function extractType(texte) {
  for (const { type, re } of TYPES) if (re.test(texte)) return type;
  return "Mission";
}

const STRUCTURES = [
  { s: "Cabinet libéral", re: /lib[ée]ral|cabinet/i },
  { s: "Centre / clinique", re: /clinique|centre (?:de sant[ée]|ophtalmo|m[ée]dical)/i },
  { s: "Maison de santé", re: /maison (?:m[ée]dicale|de sant[ée])|MSP|p[ôo]le sant[ée]/i },
  { s: "Hôpital", re: /h[ôo]pital|CHU|CHR|hospitalier/i },
  { s: "Ophtalmologiste", re: /ophtalmologiste|ophtalmologue/i },
];

function extractStructure(texte) {
  for (const { s, re } of STRUCTURES) if (re.test(texte)) return s;
  return null;
}

const SPECIALITES = [
  ["Neurovisuel", /neuro[- ]?visuel/i],
  ["Basse vision", /basse vision/i],
  ["Bébé vision", /b[ée]b[ée] vision|nourrisson/i],
  ["Strabologie", /strabo|amblyopie/i],
  ["Vertiges / vestibulaire", /vertige|vestibulaire/i],
  ["Réfraction", /r[ée]fraction|renouvellement (?:de )?lunettes/i],
  ["Dépistage rétinopathie", /r[ée]tinopathie|t[ée]l[ée][- ]?ophtalmo/i],
  ["Champ visuel", /champ visuel/i],
  ["Rééducation", /r[ée][ée]ducation/i],
];

function extractSpecialites(texte) {
  return SPECIALITES.filter(([, re]) => re.test(texte)).map(([label]) => label);
}

function extractDate(texte) {
  const m = texte.match(/\((\d{2})\/(\d{2})\/(\d{4})\)\s*$/);
  if (!m) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Résumé court, sans coordonnées ni date, coupé sur une frontière de phrase. */
function resumer(texte, max = 190) {
  let t = texte
    .replace(/\(\d{2}\/\d{2}\/\d{4}\)\s*$/, "")
    .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "")
    .replace(/(?:\+33|0)\s*\d(?:[\s.-]*\d{2}){4}/g, "")
    .replace(/Contact(?:er)?(?: par)?[^.]*$/i, "")
    .replace(/\s+([,.])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  const point = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf(" ; "));
  return (point > max * 0.5 ? coupe.slice(0, point + 1) : coupe.trimEnd() + "…").trim();
}

/* ──────────────────────── pipeline ───────────────────────── */

async function fetchLatin1(url) {
  const res = await fetch(url, { headers: { "User-Agent": "LesOrthoptistes.fr/1.0 (veille annonces)" } });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  const buf = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buf);
}

function parseAnnonces(html, categorie) {
  const items = html.match(/<li>[\s\S]*?(?=<li>|<\/ol>)/g) ?? [];
  const out = [];

  for (const item of items) {
    const emails = [...item.matchAll(/mailto:([^"'?]+)/gi)].map((m) => decodeEntities(m[1]).trim().toLowerCase());
    const texte = stripTags(item);
    if (texte.length < 60) continue;

    const date = extractDate(texte);
    const telMatch = texte.match(/(?:\+33|0)\s*\d(?:[\s.-]*\d{2}){4}/);
    const { ville, departement, code } = extractLieu(texte);

    out.push({
      categorie,
      date,
      ville,
      departement,
      codeDept: code,
      type: extractType(texte),
      structure: extractStructure(texte),
      specialites: extractSpecialites(texte),
      resume: resumer(texte),
      texte,
      emails: [...new Set(emails)],
      telephone: telMatch ? telMatch[0].replace(/[\s.-]+/g, " ").trim() : null,
    });
  }
  return out;
}

const slug = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  const annonces = [];
  for (const src of SOURCES) {
    const html = await fetchLatin1(src.url);
    const parsed = parseAnnonces(html, src.categorie);
    console.log(`${src.url} → ${parsed.length} annonces`);
    annonces.push(...parsed.map((a) => ({ ...a, source: src.url })));
  }

  annonces.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  annonces.forEach((a, i) => {
    a.id = `${a.date ?? "0000-00-00"}-${slug(a.ville) || slug(a.departement) || "fr"}-${i}`;
  });

  const scrapedAt = new Date().toISOString();

  // ── Fichier privé : tout, contacts inclus (prospection). ──
  await mkdir(resolve(ROOT, "data"), { recursive: true });
  await writeFile(
    resolve(ROOT, "data/leads.json"),
    JSON.stringify({ scrapedAt, total: annonces.length, annonces }, null, 2),
    "utf8",
  );

  // ── Export CSV pour la prospection (un contact par ligne). ──
  const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lignes = [["date", "email", "telephone", "ville", "departement", "code", "type", "structure", "annonce", "source"].join(",")];
  for (const a of annonces) {
    if (!a.emails.length && !a.telephone) continue;
    lignes.push(
      [a.date, a.emails.join(" ; "), a.telephone, a.ville, a.departement, a.codeDept, a.type, a.structure, a.texte, a.source]
        .map(csvCell)
        .join(","),
    );
  }
  await writeFile(resolve(ROOT, "data/leads.csv"), "﻿" + lignes.join("\n"), "utf8");

  // ── Fichier public : aucune coordonnée, résumé court. ──
  const publiques = annonces
    .filter((a) => a.date && (a.ville || a.departement))
    .map(({ id, date, ville, departement, codeDept, type, structure, specialites, resume, emails, telephone }) => ({
      id, date, ville, departement, codeDept, type, structure,
      specialites: specialites.slice(0, 3),
      resume,
      contact: emails.length ? "email" : telephone ? "telephone" : "autre",
    }));

  await mkdir(resolve(ROOT, "src/data"), { recursive: true });
  await writeFile(
    resolve(ROOT, "src/data/missions.json"),
    JSON.stringify({ scrapedAt, total: publiques.length, missions: publiques }, null, 2),
    "utf8",
  );

  const avecEmail = annonces.filter((a) => a.emails.length).length;
  console.log(`→ data/leads.json : ${annonces.length} annonces (${avecEmail} avec email)`);
  console.log(`→ src/data/missions.json : ${publiques.length} missions publiques`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
