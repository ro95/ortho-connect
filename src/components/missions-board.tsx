"use client";

import { useMemo, useState } from "react";
import { LockIcon, MapPinIcon, SearchIcon } from "./icons";

export interface MissionCard {
  id: string;
  type: string;
  lieu: string;
  departement: string | null;
  codeDept: string | null;
  ville: string | null;
  specialites: string[];
  resume: string;
  anciennete: string;
  recente: boolean;
}

interface Props {
  missions: MissionCard[];
  types: { type: string; count: number }[];
}

const PAR_PAGE = 9;

const COULEURS_TYPE: Record<string, string> = {
  Remplacement: "bg-accent-500/10 text-accent-600 ring-accent-500/20",
  Collaboration: "bg-primary-50 text-primary-700 ring-primary-200",
  Salariat: "bg-gray-100 text-gray-600 ring-gray-200",
};

function badgeType(type: string) {
  return COULEURS_TYPE[type] ?? "bg-gray-100 text-gray-600 ring-gray-200";
}

const normaliser = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function MissionsBoard({ missions, types }: Props) {
  const [recherche, setRecherche] = useState("");
  const [typeActif, setTypeActif] = useState<string | null>(null);
  const [visibles, setVisibles] = useState(PAR_PAGE);

  const index = useMemo(
    () =>
      missions.map((m) => ({
        mission: m,
        cle: normaliser([m.ville, m.departement, m.codeDept, m.type, ...m.specialites].filter(Boolean).join(" ")),
      })),
    [missions],
  );

  const resultats = useMemo(() => {
    const q = normaliser(recherche.trim());
    return index
      .filter(({ mission, cle }) => {
        if (typeActif && mission.type !== typeActif) return false;
        return !q || cle.includes(q);
      })
      .map(({ mission }) => mission);
  }, [index, recherche, typeActif]);

  function reinitialiser(next: () => void) {
    next();
    setVisibles(PAR_PAGE);
  }

  return (
    <div>
      {/* ── Filtres ── */}
      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={recherche}
            onChange={(e) => reinitialiser(() => setRecherche(e.target.value))}
            placeholder="Votre ville ou votre département…"
            aria-label="Rechercher une mission par ville ou département"
            className="w-full rounded-2xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-shadow focus:border-primary-300 focus:outline-none focus:shadow-lg focus:shadow-primary-900/5"
          />
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reinitialiser(() => setTypeActif(null))}
            className={`rounded-xl px-3 py-2 text-xs font-medium ring-1 transition-colors ${
              typeActif === null
                ? "bg-primary-600 text-white ring-primary-600"
                : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            Toutes
          </button>
          {types.slice(0, 4).map(({ type, count }) => (
            <button
              key={type}
              type="button"
              onClick={() => reinitialiser(() => setTypeActif(typeActif === type ? null : type))}
              className={`rounded-xl px-3 py-2 text-xs font-medium ring-1 transition-colors ${
                typeActif === type
                  ? "bg-primary-600 text-white ring-primary-600"
                  : "bg-white text-gray-600 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {type} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-gray-400" aria-live="polite">
        {resultats.length === 0
          ? "Aucune mission ne correspond à cette recherche pour l'instant."
          : `${resultats.length} mission${resultats.length > 1 ? "s" : ""} correspondent à votre recherche.`}
      </p>

      {/* ── Grille ── */}
      {resultats.length > 0 ? (
        <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resultats.slice(0, visibles).map((m) => (
            <li
              key={m.id}
              className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 transition-shadow hover:shadow-lg hover:shadow-primary-900/5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1 ${badgeType(m.type)}`}>
                  {m.type}
                </span>
                <span className="text-[11px] text-gray-400">
                  {m.recente && <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent-500 align-middle" />}
                  {m.anciennete}
                </span>
              </div>

              <p className="mt-4 flex items-center gap-1.5 font-semibold text-gray-900">
                <MapPinIcon className="h-4 w-4 shrink-0 text-primary-600" />
                {m.lieu}
              </p>

              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{m.resume}</p>

              {m.specialites.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {m.specialites.map((s) => (
                    <span key={s} className="rounded-md bg-gray-50 px-2 py-1 text-[11px] font-medium text-gray-500 ring-1 ring-gray-100">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <a
                href="#inscription"
                className="mt-5 flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2.5 text-xs font-medium text-gray-500 ring-1 ring-gray-100 transition-colors hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200"
              >
                <LockIcon className="h-4 w-4 shrink-0" />
                Coordonnées du recruteur — débloquées à l&apos;ouverture
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <p className="text-sm text-gray-500">
            Laissez-nous votre email : on vous prévient dès qu&apos;une mission correspond à votre secteur.
          </p>
          <a
            href="#inscription"
            className="mt-4 inline-flex rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
          >
            Créer mon alerte
          </a>
        </div>
      )}

      {visibles < resultats.length && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibles((v) => v + PAR_PAGE)}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Afficher plus de missions ({resultats.length - visibles} restantes)
          </button>
        </div>
      )}
    </div>
  );
}
