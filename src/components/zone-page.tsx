import Link from "next/link";
import MissionsBoard, { type MissionCard } from "./missions-board";
import SubscribeForm from "./subscribe-form";
import { Footer, Navbar } from "./site-chrome";
import { MapPinIcon } from "./icons";
import { formatAnciennete, formatLieu } from "@/lib/missions";
import { REFERENCE, type Zone } from "@/lib/geo";
import { breadcrumbJsonLd, collectionJsonLd, JsonLd } from "@/lib/seo";

export interface LienZone {
  href: string;
  label: string;
  count: number;
}

export interface BlocLiens {
  titre: string;
  liens: LienZone[];
}

/**
 * Bloc d'entités citées sans lien : les communes sous le seuil de publication
 * n'ont pas de page. Leur nom doit être présent et indexable ici, mais pointer
 * vers une page inexistante créerait des liens morts par centaines.
 */
export interface BlocTexte {
  titre: string;
  note?: string;
  entrees: { label: string; count: number }[];
}

interface Props {
  zone: Zone;
  /** Titre H1 — unique par page, distinct de la balise <title>. */
  h1: string;
  /** Chapeau calculé sur les données de la zone. */
  chapeau: string;
  /** Paragraphes complémentaires, également calculés. */
  paragraphes: string[];
  /** Fil d'Ariane, racine incluse. Le dernier élément est la page courante. */
  fil: { nom: string; chemin: string }[];
  /** Chiffres clés affichés en bandeau. */
  faits: { valeur: string | number; label: string }[];
  /** Blocs de maillage interne affichés sous les annonces. */
  blocs?: BlocLiens[];
  /** Blocs d'entités citées sans lien, affichés après le maillage. */
  blocsTexte?: BlocTexte[];
  /** Description reprise dans les données structurées. */
  description: string;
  /** Zone pré-remplie envoyée avec l'inscription, pour savoir d'où viennent les leads. */
  zoneLead: string;
}

const SEUIL_RECENT = (() => {
  const d = new Date(REFERENCE);
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
})();

export default function ZonePage({
  zone,
  h1,
  chapeau,
  paragraphes,
  fil,
  faits,
  blocs = [],
  blocsTexte = [],
  description,
  zoneLead,
}: Props) {
  const chemin = fil[fil.length - 1].chemin;

  const cartes: MissionCard[] = zone.missions.map((m) => ({
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
      <JsonLd data={collectionJsonLd({ titre: h1, description, chemin, missions: zone.missions })} />

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
                    <span aria-current="page" className="text-gray-500">{etape.nom}</span>
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
              {zone.stats.total} {zone.stats.total > 1 ? "annonces" : "annonce"}
            </p>
            <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">{h1}</h1>
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

          <MissionsBoard missions={cartes} types={zone.stats.types} />

          {/* ── Analyse de la zone ── */}
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

          {/* ── Maillage interne ── */}
          {blocs.map((bloc) => (
            <section key={bloc.titre} className="mt-12">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">{bloc.titre}</h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {bloc.liens.map((lien) => (
                  <li key={lien.href}>
                    <Link
                      href={lien.href}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                    >
                      {lien.label}
                      <span className="text-xs text-gray-400">{lien.count}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          {/* ── Communes citées sans lien ── */}
          {blocsTexte.map((bloc) => (
            <section key={bloc.titre} className="mt-12">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">{bloc.titre}</h2>
              {bloc.note && <p className="mt-2 max-w-3xl text-sm text-gray-500">{bloc.note}</p>}
              <ul className="mt-4 flex flex-wrap gap-2">
                {bloc.entrees.map((entree) => (
                  <li
                    key={entree.label}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm text-gray-600"
                  >
                    {entree.label}
                    <span className="text-xs text-gray-400">{entree.count}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="mt-14 text-xs leading-relaxed text-gray-400">
            Résumés d&apos;annonces publiques d&apos;offres pour orthoptistes, agrégées et mises à jour
            régulièrement. Les coordonnées des recruteurs sont accessibles aux inscrits à
            l&apos;ouverture de la plateforme.
          </p>
        </div>

        {/* ── Inscription ── */}
        <section id="inscription" className="relative mt-16 scroll-mt-24 overflow-hidden py-24">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-50/80 to-white" />
          <div className="relative mx-auto max-w-2xl px-6 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">
              Soyez alerté des prochaines missions
            </h2>
            <p className="mx-auto mt-4 max-w-md text-gray-500">
              Laissez votre email : vous recevrez les nouvelles offres de ce secteur — et les
              coordonnées des recruteurs — dès l&apos;ouverture.
            </p>
            <div className="mt-10 flex justify-center">
              <SubscribeForm zone={zoneLead} />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
