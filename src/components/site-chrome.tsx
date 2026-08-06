import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";
import { EyeIcon } from "./icons";

/**
 * En-tête et pied de page partagés.
 *
 * L'accueil ancre sa navigation sur la page (`#missions`) ; les pages de zone ont
 * besoin de vrais liens. D'où `accueil` : sur la home on reste sur des ancres — pas
 * de rechargement — ailleurs on pointe vers les URLs réelles, ce qui alimente aussi
 * le maillage interne.
 */
export function Navbar({ accueil = false }: { accueil?: boolean }) {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-lg bg-white/70 border-b border-gray-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-primary-700 font-bold text-lg tracking-tight">
          <EyeIcon className="w-7 h-7" />
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href={accueil ? "#missions" : "/missions"}
            className="hidden text-sm font-medium text-gray-500 transition-colors hover:text-primary-700 sm:block"
          >
            Les missions
          </Link>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 ring-1 ring-primary-200">
            Bientôt disponible
          </span>
        </div>
      </div>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
          <EyeIcon className="w-5 h-5" />
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-5 text-xs text-gray-400">
          <Link href="/missions" className="transition-colors hover:text-primary-700">
            Toutes les missions
          </Link>
          {/* Composant serveur : l'année est figée au build, jamais réévaluée côté client. */}
          <span>&copy; {new Date().getFullYear()} {SITE_NAME}</span>
        </div>
      </div>
    </footer>
  );
}
