import Link from "next/link";
import type { Metadata } from "next";
import { Footer, Navbar } from "@/components/site-chrome";
import { MapPinIcon } from "@/components/icons";
import { formatAnciennete } from "@/lib/missions";
import {
  REFERENCE,
  SEUIL_VILLE,
  getCommunesSousLeSeuil,
  getDepartements,
  getRegionsZones,
  getVilles,
  urls,
  type ZoneVille,
} from "@/lib/geo";
import { citerCommunes, texteIndexVilles } from "@/lib/redaction";
import { breadcrumbJsonLd, buildMetadata, JsonLd, pagesJsonLd } from "@/lib/seo";

/**
 * Index des villes couvertes.
 *
 * `/missions/ville` était un segment d'URL traversé sans page : les 33 pages de
 * ville n'étaient atteignables que depuis le hub, qui les listait toutes. Cette
 * page devient le palier qui concentre les liens entrants puis les redistribue,
 * et le hub n'en garde qu'un teaser pour ne pas dupliquer la même liste.
 */

/** Villes d'une région, la région n'étant liée que si elle a sa propre page. */
interface GroupeRegional {
  nom: string;
  chemin: string | null;
  villes: ZoneVille[];
}

const villes = getVilles();

// `getRegionsZones` inclut les régions sans page dédiée : c'est ce qui garantit
// qu'aucune ville ne se retrouve orpheline faute de région publiée.
const groupes: GroupeRegional[] = getRegionsZones()
  .filter((r) => r.villes.length > 0)
  .map((r) => ({
    nom: r.nom,
    chemin: r.publiee ? urls.region(r.slug) : null,
    villes: r.villes,
  }));

const communesSansPage = getDepartements().flatMap((d) => getCommunesSousLeSeuil(d.departement.code));

const { chapeau, paragraphes } = texteIndexVilles({
  villes,
  nbRegions: groupes.length,
  communesSansPage: citerCommunes(communesSansPage),
});

const H1 = "Missions d'orthoptiste par ville";

export const metadata: Metadata = buildMetadata({
  titre: `Missions d'orthoptiste par ville — ${villes.length} villes couvertes en France`,
  description: chapeau,
  chemin: urls.villes(),
});

const fil = [
  { nom: "Accueil", chemin: "/" },
  { nom: "Missions", chemin: urls.hub() },
  { nom: "Villes", chemin: urls.villes() },
];

const faits = [
  { valeur: villes.length, label: "Villes couvertes" },
  { valeur: villes.reduce((n, v) => n + v.stats.total, 0), label: "Annonces cumulées" },
  { valeur: groupes.length, label: "Régions concernées" },
  { valeur: villes.reduce((n, v) => n + v.stats.recentes30j, 0), label: "Publiées sur 30 j" },
];

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(fil)} />
      <JsonLd
        data={pagesJsonLd({
          titre: H1,
          description: chapeau,
          chemin: urls.villes(),
          pages: villes.map((v) => ({ nom: v.nom, chemin: urls.ville(v.slug) })),
        })}
      />

      <Navbar />

      <main className="pt-28">
        <div className="mx-auto max-w-6xl px-6">
          {/* ── Fil d'Ariane ── */}
          <nav aria-label="Fil d'Ariane" className="text-xs text-gray-400">
            <ol className="flex flex-wrap items-center gap-1.5">
              {fil.map((etape, i) => (
                <li key={etape.chemin} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden>/</span>}
                  {i === fil.length - 1 ? (
                    <span aria-current="page" className="text-gray-500">
                      {etape.nom}
                    </span>
                  ) : (
                    <Link href={etape.chemin} className="transition-colors hover:text-primary-700">
                      {etape.nom}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* ── En-tête ── */}
          <header className="mt-6 max-w-3xl">
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 ring-1 ring-primary-200">
              <MapPinIcon className="h-3.5 w-3.5" />
              {villes.length} villes
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{H1}</h1>
            <p className="mt-5 text-base leading-relaxed text-gray-600">{chapeau}</p>
          </header>

          {/* ── Chiffres clés ── */}
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {faits.map(({ valeur, label }) => (
              <div key={label} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-center">
                <p className="stat-value text-2xl font-bold text-primary-700">{valeur}</p>
                <p className="mt-1 text-xs text-gray-400">{label}</p>
              </div>
            ))}
          </div>

          {/* ── Encarts, groupés par région ── */}
          {groupes.map((groupe) => (
            <section key={groupe.nom} className="mt-14">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                {groupe.chemin ? (
                  <Link href={groupe.chemin} className="transition-colors hover:text-primary-700">
                    {groupe.nom}
                  </Link>
                ) : (
                  groupe.nom
                )}
              </h2>
              <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupe.villes.map((ville) => (
                  <li key={ville.slug}>
                    <EncartVille ville={ville} />
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* ── Analyse ── */}
          {paragraphes.length > 0 && (
            <section className="mt-16 max-w-3xl">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">
                Ce que disent ces annonces
              </h2>
              <div className="mt-4 space-y-3">
                {paragraphes.map((p) => (
                  <p key={p} className="text-sm leading-relaxed text-gray-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {/* ── Communes citées sans lien : elles n'ont pas de page à recevoir ── */}
          {communesSansPage.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Communes sans page dédiée</h2>
              <p className="mt-2 max-w-3xl text-sm text-gray-500">
                Ces communes comptent moins de {SEUIL_VILLE} annonces : leurs offres sont regroupées sur
                la page de leur département, où elles restent consultables.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {communesSansPage.map((commune) => (
                  <li
                    key={`${commune.slug}-${commune.departement.code}`}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                  >
                    {commune.nom}
                    <span className="text-xs text-gray-400">{commune.departement.code}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Retour aux autres axes de navigation ── */}
          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Chercher autrement</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              <li>
                <Link
                  href={urls.hub()}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                >
                  Toutes les missions, par département et par type
                </Link>
              </li>
            </ul>
          </section>

          <p className="mt-14 text-xs leading-relaxed text-gray-400">
            Résumés d&apos;annonces publiques d&apos;offres pour orthoptistes, agrégées et mises à jour
            régulièrement. Les coordonnées des recruteurs sont accessibles aux inscrits à
            l&apos;ouverture de la plateforme.
          </p>
        </div>
      </main>

      <Footer />
    </>
  );
}

/**
 * Un encart porte les chiffres réels de la ville : sans cela, la page ne serait
 * qu'une liste de liens, indiscernable du bloc « Par ville » du hub.
 */
function EncartVille({ ville }: { ville: ZoneVille }) {
  const { stats, departement } = ville;
  const typeDominant = stats.types[0];
  const specialite = stats.specialites[0];

  return (
    <Link
      href={urls.ville(ville.slug)}
      className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 transition-colors hover:border-primary-200 hover:bg-primary-50/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-primary-700">
          {ville.nom}
        </h3>
        <span className="shrink-0 text-xs text-gray-400">
          {stats.total} {stats.total > 1 ? "annonces" : "annonce"}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-400">
        {departement.nom} ({departement.code})
      </p>

      <dl className="mt-4 space-y-1 text-xs text-gray-500">
        {typeDominant && (
          <div className="flex gap-1.5">
            <dt className="text-gray-400">Surtout</dt>
            <dd>
              {typeDominant.type} ({typeDominant.count})
            </dd>
          </div>
        )}
        {specialite && (
          <div className="flex gap-1.5">
            <dt className="text-gray-400">Le plus demandé</dt>
            <dd>{specialite.nom}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="text-gray-400">Dernière annonce</dt>
          <dd>{formatAnciennete(stats.derniere, REFERENCE)}</dd>
        </div>
      </dl>
    </Link>
  );
}
