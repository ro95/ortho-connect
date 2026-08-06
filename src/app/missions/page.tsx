import Link from "next/link";
import type { Metadata } from "next";
import MissionsBoard, { type MissionCard } from "@/components/missions-board";
import SubscribeForm from "@/components/subscribe-form";
import { Footer, Navbar } from "@/components/site-chrome";
import { formatAnciennete, formatLieu, getMissions, getMissionsStats } from "@/lib/missions";
import { REFERENCE, getRegionsZones, getTypes, getVilles, urls } from "@/lib/geo";
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

const SEUIL_RECENT = (() => {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
})();

export default function Page() {
  const missions = getMissions();
  const regions = getRegionsZones();
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

          {/* ── Par type ── */}
          <section className="mt-16">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Par type de mission</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {types.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={urls.type(t.slug)}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {t.nom}
                    <span className="text-xs text-gray-400">{t.missions.length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Par ville ── */}
          {villes.length > 0 && (
            <section className="mt-12">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Par ville</h2>
              <p className="mt-2 text-sm text-gray-500">
                Les villes comptant au moins deux annonces. Les communes plus isolées sont
                regroupées sur la page de leur département.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {villes.map((v) => (
                  <li key={v.slug}>
                    <Link
                      href={urls.ville(v.slug)}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {v.nom}
                      <span className="text-xs text-gray-400">{v.missions.length}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── Par département, groupé par région ── */}
          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Par région et département</h2>
            <p className="mt-2 text-sm text-gray-500">
              Les régions comptant plusieurs départements pourvus ont leur propre page. Ailleurs, la
              page du département fait déjà office de page régionale.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {regions.map((zoneRegion) => (
                <div key={zoneRegion.slug} className="rounded-2xl border border-gray-100 bg-white p-5">
                  <h3 className="flex items-baseline justify-between gap-2 text-sm font-semibold text-gray-900">
                    {zoneRegion.publiee ? (
                      <Link
                        href={urls.region(zoneRegion.slug)}
                        className="transition-colors hover:text-primary-700"
                      >
                        {zoneRegion.nom}
                      </Link>
                    ) : (
                      <span>{zoneRegion.nom}</span>
                    )}
                    <span className="text-xs font-normal text-gray-400">
                      {zoneRegion.stats.total}
                    </span>
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {zoneRegion.departements.map((d) => (
                      <li key={d.slug}>
                        <Link
                          href={urls.departement(d.slug)}
                          className="flex items-baseline justify-between gap-2 text-sm text-gray-600 transition-colors hover:text-primary-700"
                        >
                          <span>
                            {d.nom} <span className="text-gray-400">({d.departement.code})</span>
                          </span>
                          <span className="text-xs text-gray-400">{d.missions.length}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <p className="mt-14 text-xs leading-relaxed text-gray-400">
            Résumés d&apos;annonces publiques d&apos;offres pour orthoptistes, agrégées et mises à jour
            régulièrement. Les coordonnées des recruteurs sont accessibles aux inscrits à
            l&apos;ouverture de la plateforme.
          </p>
        </div>

        <section id="inscription" className="relative mt-16 scroll-mt-24 overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-50/80 to-white" />
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
