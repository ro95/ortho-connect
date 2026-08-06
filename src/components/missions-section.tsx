import MissionsBoard, { type MissionCard } from "./missions-board";
import { formatAnciennete, formatLieu, getMissions, getMissionsStats } from "@/lib/missions";

/**
 * Section « missions ». Les annonces proviennent des espaces publics de la profession :
 * on n'affiche qu'un résumé et jamais les coordonnées du recruteur — c'est ce qui
 * justifie l'inscription et évite de republier des données de contact.
 */
export default function MissionsSection() {
  const stats = getMissionsStats();
  const missions = getMissions();

  // Référence de fraîcheur = annonce la plus récente, pour un rendu stable (pas de Date.now()).
  const reference = missions.reduce((max, m) => (m.date > max ? m.date : max), missions[0]?.date ?? "");
  const seuilRecent = new Date(reference);
  seuilRecent.setDate(seuilRecent.getDate() - 7);
  const seuilIso = seuilRecent.toISOString().slice(0, 10);

  const cartes: MissionCard[] = missions.map((m) => ({
    id: m.id,
    type: m.type,
    lieu: formatLieu(m),
    ville: m.ville,
    departement: m.departement,
    codeDept: m.codeDept,
    specialites: m.specialites,
    resume: m.resume,
    anciennete: formatAnciennete(m.date, reference),
    recente: m.date >= seuilIso,
  }));

  return (
    <section id="missions" className="scroll-mt-24 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent-500/10 px-3 py-1 text-xs font-medium text-accent-600 ring-1 ring-accent-500/20">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
            </span>
            {stats.recentes30j} nouvelles missions ce mois-ci
          </span>

          <h2 className="mt-5 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Les missions qui vous attendent
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-500">
            {stats.total} offres pour orthoptistes actuellement ouvertes en France — remplacements,
            collaborations, postes salariés. Cherchez la vôtre.
          </p>
        </div>

        {/* ── Chiffres clés ── */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { valeur: stats.total, label: "Missions ouvertes" },
            { valeur: stats.departements, label: "Départements couverts" },
            { valeur: stats.villes, label: "Villes concernées" },
            { valeur: stats.recentes30j, label: "Publiées ce mois-ci" },
          ].map(({ valeur, label }) => (
            <div key={label} className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-center">
              <p className="stat-value text-2xl font-bold text-primary-700">{valeur}</p>
              <p className="mt-1 text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <MissionsBoard missions={cartes} types={stats.types} />

        <p className="mt-8 text-center text-xs text-gray-400">
          Résumés d&apos;annonces publiques d&apos;offres pour orthoptistes, agrégées et mises à jour
          régulièrement. Les coordonnées des recruteurs sont accessibles aux inscrits à l&apos;ouverture
          de la plateforme.
        </p>
      </div>
    </section>
  );
}
