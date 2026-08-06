import { SITE_NAME } from "@/lib/constants";
import { EyeIcon, SearchIcon, CalendarIcon, ShieldIcon } from "@/components/icons";
import SubscribeForm from "@/components/subscribe-form";
import BentoCard from "@/components/bento-card";
import HeroIllustration from "@/components/hero-illustration";
import MissionsSection from "@/components/missions-section";
import { getMissionsStats } from "@/lib/missions";

/* ───────────────────────── Navbar ───────────────────────── */
function Navbar() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-lg bg-white/70 border-b border-gray-100">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <a href="#" className="flex items-center gap-2 text-primary-700 font-bold text-lg tracking-tight">
          <EyeIcon className="w-7 h-7" />
          {SITE_NAME}
        </a>
        <div className="flex items-center gap-4">
          <a href="#missions" className="hidden text-sm font-medium text-gray-500 transition-colors hover:text-primary-700 sm:block">
            Les missions
          </a>
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-600 ring-1 ring-primary-200">
            Bientôt disponible
          </span>
        </div>
      </div>
    </nav>
  );
}

/* ───────────────────── Hero Bento ────────────────────────── */
function HeroBento({ total, departements }: { total: number; departements: number }) {
  return (
    <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24">
      {/* Background blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-primary-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-32 h-[400px] w-[400px] rounded-full bg-accent-400/15 blur-3xl" />

      <div className="relative mx-auto max-w-5xl px-6">
        {/* ── Bento hero grid ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5 lg:grid-rows-[auto_auto]">

          {/* ── Main cell: headline + form (3 cols, 2 rows) ── */}
          <div className="lg:col-span-3 lg:row-span-2 flex flex-col justify-center py-4">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl animate-fade-in-up">
              La plateforme qui connecte les{" "}
              <span className="bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
                orthoptistes
              </span>{" "}
              à leurs missions
            </h1>

            <p className="mt-5 max-w-md text-base text-gray-500 animate-fade-in-up animation-delay-100">
              <strong className="font-semibold text-gray-700">{total} missions</strong> sont
              ouvertes en ce moment dans {departements} départements. Inscrivez-vous pour être
              parmi les premiers à y accéder.
            </p>

            <div className="mt-8 animate-fade-in-up animation-delay-200">
              <SubscribeForm />
            </div>

            <a
              href="#missions"
              className="mt-4 inline-flex text-sm font-medium text-primary-700 underline-offset-4 hover:underline animate-fade-in-up animation-delay-300"
            >
              Voir les missions disponibles →
            </a>
          </div>

          {/* ── Illustration cell (2 cols, top right) ── */}
          <BentoCard className="lg:col-span-2 lg:row-span-2 flex items-center justify-center bg-gradient-to-br from-primary-50/80 to-white p-4 animate-fade-in-up animation-delay-200">
            <HeroIllustration className="w-full max-w-[280px] h-auto" />
          </BentoCard>

        </div>

        {/* ── Stats row below hero ── */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-in-up animation-delay-300">
          <BentoCard className="flex items-center gap-4 py-5 px-6">
            <p className="stat-value text-3xl font-bold text-primary-700">6 600+</p>
            <p className="text-xs text-gray-400 leading-tight">Orthoptistes<br />en France</p>
          </BentoCard>
          <BentoCard className="flex items-center gap-4 py-5 px-6">
            <p className="stat-value text-3xl font-bold text-primary-700">+42%</p>
            <p className="text-xs text-gray-400 leading-tight">De croissance<br />en 10 ans</p>
          </BentoCard>
          <BentoCard className="flex items-center gap-4 py-5 px-6">
            <p className="stat-value text-3xl font-bold text-accent-600">{total}</p>
            <p className="text-xs text-gray-400 leading-tight">Missions<br />ouvertes</p>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────── Bento Features ──────────────────── */
function BentoFeatures() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto max-w-5xl px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl reveal">
          Pourquoi LesOrthoptistes.fr ?
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-center text-gray-500 reveal">
          Une plateforme pensée exclusivement pour l&apos;orthoptie.
        </p>

        {/* ── Bento grid ── */}
        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 reveal">

          {/* Card 1 — spans 2 cols */}
          <BentoCard className="sm:col-span-2 flex flex-col gap-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <SearchIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Des missions triées pour vous</h3>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-gray-500">
                Cabinets, cliniques, hôpitaux — on centralise les offres pour que vous n&apos;ayez plus à chercher partout.
              </p>
            </div>
          </BentoCard>

          {/* Card 2 — tall */}
          <BentoCard className="sm:row-span-2 flex flex-col justify-between gap-6">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-500/10 text-accent-600">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <h3 className="mt-5 text-xl font-semibold text-gray-900">Flexibilité totale</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-500">
                Choisissez le rythme et le format qui vous conviennent.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {["Remplacement", "CDD", "Vacation", "Collaboration", "Temps partiel", "Libéral"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-lg bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-600 ring-1 ring-gray-100 transition-colors hover:bg-primary-50 hover:text-primary-700 hover:ring-primary-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </BentoCard>

          {/* Card 3 */}
          <BentoCard>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
              <ShieldIcon className="w-5 h-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-gray-900">100% orthoptie</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Pas de bruit. Pas de missions généralistes. Les bons critères pour votre spécialité.
            </p>
          </BentoCard>

          {/* Card 4 — highlight */}
          <BentoCard className="flex flex-col items-center justify-center text-center bg-gradient-to-br from-primary-600 to-primary-800 border-primary-700">
            <p className="stat-value text-5xl font-extrabold text-white">0</p>
            <p className="mt-2 text-sm font-medium text-primary-200">
              Plateforme dédiée aux orthoptistes… jusqu&apos;ici.
            </p>
          </BentoCard>

        </div>
      </div>
    </section>
  );
}

/* ──────────────────── Bottom CTA ────────────────────────── */
function BottomCTA() {
  return (
    <section id="inscription" className="relative scroll-mt-24 overflow-hidden py-24 md:py-32 reveal">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary-50/80 to-white" />
      <div className="relative mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Prêt à ne plus chercher vos missions à l&apos;aveugle ?
        </h2>
        <p className="mx-auto mt-4 max-w-md text-gray-500">
          Laissez-nous votre email : vous recevrez les missions de votre secteur — et les
          coordonnées des recruteurs — dès l&apos;ouverture.
        </p>
        <div className="mt-10 flex justify-center">
          <SubscribeForm />
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Footer ───────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-gray-100 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-between">
        <a href="#" className="flex items-center gap-2 text-primary-700 font-semibold text-sm">
          <EyeIcon className="w-5 h-5" />
          {SITE_NAME}
        </a>
        <p className="text-xs text-gray-400">
          &copy; {new Date().getFullYear()} {SITE_NAME}. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

/* ───────────────────────── Page ─────────────────────────── */
export default function Home() {
  const stats = getMissionsStats();

  return (
    <>
      <Navbar />
      <main>
        <HeroBento total={stats.total} departements={stats.departements} />
        <MissionsSection />
        <BentoFeatures />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
