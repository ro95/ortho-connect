import Link from "next/link";
import type { Metadata } from "next";
import MissionsBoard, { type MissionCard } from "@/components/missions-board";
import SubscribeForm from "@/components/subscribe-form";
import { Footer, Navbar } from "@/components/site-chrome";
import { formatAnciennete, formatLieu, getMissions, getMissionsStats } from "@/lib/missions";
import {
  REFERENCE,
  SEUIL_RECENT,
  getDepartements,
  getRegionsPubliees,
  getTypes,
  getVilles,
  urls,
} from "@/lib/geo";
import { breadcrumbJsonLd, buildMetadata, collectionJsonLd, JsonLd } from "@/lib/seo";

const stats = getMissionsStats();

const DESCRIPTION =
  `${stats.total} missions d'orthoptie ouvertes en France : remplacements, collaborations, ` +
  `postes salariés. Parcourez les offres par département, par ville ou par type de contrat.`;

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste en France — ${stats.total} offres par ville et département`,
  description: DESCRIPTION,
  chemin: urls.hub(),
});

/**
 * Le hub ne montre que les zones de tête de chaque axe : lister l'intégralité d'un
 * palier ici ET sur son index ferait deux pages au contenu identique, qui se
 * cannibaliseraient. Le hub amorce, l'index redistribue.
 */
const MAX_TEASER = 8;

/**
 * L'axe des types ne compte qu'une poignée d'entrées : en montrer huit reviendrait
 * à les montrer toutes, et l'index n'aurait plus rien à apporter.
 */
const MAX_TYPES_TEASER = 4;

export default function Page() {
  const missions = getMissions();
  // Seules les régions publiées sont amorcées ici : les autres n'ont pas de page à
  // recevoir, et l'index des régions les cite déjà en clair.
  const regions = getRegionsPubliees();
  const departements = getDepartements();
  const villes = getVilles();
  const types = getTypes();

  const fil = [
    { nom: "Accueil", chemin: "/" },
    { nom: "Missions", chemin: urls.hub() },
  ];

  const cartes: MissionCard[] = missions.map((m) => ({
    id: m.id,
    type: m.type,
    lieu: formatLieu(m),
    ville: m.ville,
    departement: m.departement,
    codeDept: m.codeDept,
    specialites: m.specialites,
    resume: m.resume,
    anciennete: formatAnciennete(m.date, REFERENCE),
    recente: m.date >= SEUIL_RECENT,
  }));

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(fil)} />
      <JsonLd
        data={collectionJsonLd({
          titre: "Missions d'orthoptiste en France",
          description: DESCRIPTION,
          chemin: urls.hub(),
          missions,
        })}
      />

      <Navbar />

      <main className="pt-28">
        <div className="mx-auto max-w-6xl px-6">
          <nav aria-label="Fil d'Ariane" className="text-xs text-gray-400">
            <ol className="flex items-center gap-1.5">
              <li>
                <Link href="/" className="transition-colors hover:text-primary-700">
                  Accueil
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-gray-500">
                Missions
              </li>
            </ol>
          </nav>

          <header className="mt-6 max-w-3xl">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              Missions d&apos;orthoptiste en France
            </h1>
            <p className="mt-5 text-base leading-relaxed text-gray-600">
              {stats.total} missions d&apos;orthoptie sont actuellement ouvertes, réparties sur{" "}
              {stats.departements} départements et {stats.villes} villes. Parcourez-les ci-dessous,
              ou allez directement à votre secteur.
            </p>
          </header>

          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { valeur: stats.total, label: "Missions ouvertes" },
              { valeur: stats.departements, label: "Départements" },
              { valeur: stats.villes, label: "Villes" },
              { valeur: stats.recentes30j, label: "Publiées sur 30 j" },
            ].map(({ valeur, label }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-center">
                <p className="stat-value text-2xl font-bold text-primary-700">{valeur}</p>
                <p className="mt-1 text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          <MissionsBoard missions={cartes} types={stats.types} />

          {/* ── Quatre axes, quatre teasers : chaque annuaire complet vit sur son index ── */}
          <SectionTeaser
            titre="Par type de mission"
            note={`Les formats les plus représentés. Les ${types.length} types recensés sont réunis sur l'index des types de mission.`}
            entrees={types.slice(0, MAX_TYPES_TEASER).map((t) => ({
              href: urls.type(t.slug),
              label: t.nom,
              count: t.missions.length,
            }))}
            index={{ href: urls.types(), label: "Tous les types de mission", count: types.length }}
            className="mt-16"
          />

          <SectionTeaser
            titre="Par région"
            note={`Les régions les mieux fournies. Les ${regions.length} régions ayant leur propre page sont réunies sur l'index des régions ; celles où un seul département est pourvu y sont citées.`}
            entrees={regions.slice(0, MAX_TEASER).map((r) => ({
              href: urls.region(r.slug),
              label: r.nom,
              count: r.missions.length,
            }))}
            index={{ href: urls.regions(), label: "Toutes les régions", count: regions.length }}
          />

          <SectionTeaser
            titre="Par département"
            note={`Les départements les mieux fournis. Les ${departements.length} départements couverts sont réunis sur l'index des départements, groupés par région.`}
            entrees={departements.slice(0, MAX_TEASER).map((d) => ({
              href: urls.departement(d.slug),
              label: `${d.nom} (${d.departement.code})`,
              count: d.missions.length,
            }))}
            index={{
              href: urls.departements(),
              label: "Tous les départements",
              count: departements.length,
            }}
          />

          <SectionTeaser
            titre="Par ville"
            note={`Les villes les mieux fournies. Les ${villes.length} villes couvertes sont réunies sur l'index des villes ; les communes plus isolées restent sur la page de leur département.`}
            entrees={villes.slice(0, MAX_TEASER).map((v) => ({
              href: urls.ville(v.slug),
              label: v.nom,
              count: v.missions.length,
            }))}
            index={{ href: urls.villes(), label: "Toutes les villes", count: villes.length }}
          />

          <p className="mt-14 text-xs leading-relaxed text-gray-400">
            Résumés d&apos;annonces publiques d&apos;offres pour orthoptistes, agrégées et mises à jour
            régulièrement. Les coordonnées des recruteurs sont accessibles aux inscrits à
            l&apos;ouverture de la plateforme.
          </p>
        </div>

        <section id="inscription" className="relative mt-16 scroll-mt-24 overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-primary-50/80 to-white" />
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Recevez les missions de votre secteur
            </h2>
            <p className="mx-auto mt-4 max-w-md text-gray-500">
              Laissez votre email : vous recevrez les nouvelles offres — et les coordonnées des
              recruteurs — dès l&apos;ouverture.
            </p>
            <div className="mt-10 flex justify-center">
              <SubscribeForm zone="France" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

interface EntreeTeaser {
  href: string;
  label: string;
  count: number;
}

/**
 * Amorce d'un axe de navigation : quelques zones de tête, puis le lien vers
 * l'index qui porte l'annuaire complet. Les quatre axes du hub partagent ce
 * gabarit — les laisser diverger reviendrait à réintroduire quatre listes
 * différentes de la même chose.
 */
function SectionTeaser({
  titre,
  note,
  entrees,
  index,
  className = "mt-12",
}: {
  titre: string;
  note: string;
  entrees: EntreeTeaser[];
  index: EntreeTeaser;
  className?: string;
}) {
  if (entrees.length === 0) return null;

  return (
    <section className={className}>
      <h2 className="text-xl font-bold tracking-tight text-gray-900">{titre}</h2>
      <p className="mt-2 max-w-3xl text-sm text-gray-500">{note}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {entrees.map(({ href, label, count }) => (
          <li key={href}>
            <Link
              href={href}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
            >
              {label}
              <span className="text-xs text-gray-400">{count}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link
            href={index.href}
            className="inline-flex items-center gap-2 rounded-xl border border-primary-200 bg-primary-50 px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-100"
          >
            {index.label}
            <span className="text-xs text-primary-600">{index.count}</span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
