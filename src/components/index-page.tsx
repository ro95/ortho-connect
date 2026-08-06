import Link from "next/link";
import type { ReactNode } from "react";
import { Footer, Navbar } from "./site-chrome";
import { MapPinIcon } from "./icons";
import { breadcrumbJsonLd, JsonLd, pagesJsonLd } from "@/lib/seo";

/**
 * Gabarit commun aux quatre pages d'index (`/missions/ville`, `/departement`,
 * `/region`, `/type`).
 *
 * Un index ne montre pas d'annonces et ne collecte pas d'email : il concentre les
 * liens entrants d'un palier puis les redistribue. `ZonePage` ne convient donc
 * pas. Ce qui varie d'un palier à l'autre, ce sont les encarts — passés en
 * `children` — et non la structure, qui doit rester identique pour que les quatre
 * pages ne divergent pas au fil des retouches.
 */

/** Passerelle vers un autre axe de navigation, en pied d'index. */
export interface LienAxe {
  href: string;
  label: string;
}

interface Props {
  /** Titre H1 — unique par page, distinct de la balise <title>. */
  h1: string;
  /** Pastille de contexte au-dessus du H1 : « 33 villes », « 7 types de mission ». */
  pastille: string;
  /** Chapeau calculé sur les zones du palier. */
  chapeau: string;
  /** Paragraphes d'analyse, également calculés. */
  paragraphes: string[];
  /** Fil d'Ariane, racine incluse. Le dernier élément est la page courante. */
  fil: { nom: string; chemin: string }[];
  /** Chiffres clés affichés en bandeau. */
  faits: { valeur: string | number; label: string }[];
  /** Pages vers lesquelles l'index redistribue, reprises telles quelles dans l'ItemList. */
  pages: { nom: string; chemin: string }[];
  /** Les encarts du palier : la seule partie réellement propre à chaque index. */
  children: ReactNode;
  /** Sections spécifiques insérées après l'analyse (communes sans page, etc.). */
  complement?: ReactNode;
  /** Liens vers les autres paliers, pour ne pas enfermer le visiteur sur un axe. */
  autresAxes: LienAxe[];
}

export default function IndexPage({
  h1,
  pastille,
  chapeau,
  paragraphes,
  fil,
  faits,
  pages,
  children,
  complement,
  autresAxes,
}: Props) {
  const chemin = fil[fil.length - 1].chemin;

  return (
    <>
      <JsonLd data={breadcrumbJsonLd(fil)} />
      <JsonLd data={pagesJsonLd({ titre: h1, description: chapeau, chemin, pages })} />

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
              {pastille}
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

          {children}

          {/* ── Analyse ── */}
          {paragraphes.length > 0 && (
            <section className="mt-16 max-w-3xl">
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Ce que disent ces annonces</h2>
              <div className="mt-4 space-y-3">
                {paragraphes.map((p) => (
                  <p key={p} className="text-sm leading-relaxed text-gray-600">
                    {p}
                  </p>
                ))}
              </div>
            </section>
          )}

          {complement}

          {/* ── Passerelles vers les autres paliers ── */}
          <section className="mt-12">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">Chercher autrement</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {autresAxes.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                  >
                    {label}
                  </Link>
                </li>
              ))}
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

/** Ligne de fait affichée dans un encart : « Surtout — Remplacement (12) ». */
export interface DetailCarte {
  label: string;
  valeur: string;
}

/**
 * Encart d'index. Il porte des chiffres réels : sans eux, la page ne serait
 * qu'une liste de liens, indiscernable du bloc correspondant du hub — et les deux
 * se cannibaliseraient au lieu de se compléter.
 */
export function CarteIndex({
  href,
  titre,
  sousTitre,
  total,
  details,
}: {
  href: string;
  titre: string;
  sousTitre: string;
  total: number;
  details: DetailCarte[];
}) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-2xl border border-gray-100 bg-white p-5 transition-colors hover:border-primary-200 hover:bg-primary-50/40"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold text-gray-900 transition-colors group-hover:text-primary-700">
          {titre}
        </h3>
        <span className="shrink-0 text-xs text-gray-400">
          {total} {total > 1 ? "annonces" : "annonce"}
        </span>
      </div>

      <p className="mt-1 text-xs text-gray-400">{sousTitre}</p>

      <dl className="mt-4 space-y-1 text-xs text-gray-500">
        {details.map(({ label, valeur }) => (
          <div key={label} className="flex gap-1.5">
            <dt className="text-gray-400">{label}</dt>
            <dd>{valeur}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

/** Grille d'encarts, éventuellement précédée d'un titre de groupe. */
export function GrilleEncarts({ children }: { children: ReactNode }) {
  return <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</ul>;
}
