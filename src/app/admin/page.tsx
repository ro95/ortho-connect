import { auth, signOut } from "@/auth";
import { getSupabase } from "@/lib/supabase";

interface Subscriber {
  id: number;
  email: string;
  subscribed_at: string;
}

async function getSubscribers(): Promise<Subscriber[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("subscribers")
      .select("id, email, subscribed_at")
      .order("subscribed_at", { ascending: false });

    if (error) {
      console.error("[admin] Supabase error:", error);
      return [];
    }
    return data ?? [];
  } catch (err) {
    console.error("[admin] Supabase init error:", err);
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await auth();
  const sorted = await getSubscribers();

  return (
    <main className="min-h-screen bg-white p-6 md:p-10">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex flex-wrap items-baseline justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">
              Inscrits — Ortho-Connect
            </h1>
            {session?.user?.email && (
              <p className="mt-1 text-xs text-gray-500">
                Connecté en tant que {session.user.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-500">
              Total :{" "}
              <strong className="text-gray-900">{sorted.length}</strong>
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/auth/signin" });
              }}
            >
              <button
                type="submit"
                className="text-sm text-gray-600 hover:text-gray-900 underline underline-offset-4"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </header>

        {sorted.length === 0 ? (
          <p className="py-12 text-center text-gray-500">
            Aucun inscrit pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-3 pr-4 font-medium">#</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 font-medium">Inscrit le</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sub, i) => (
                  <tr
                    key={sub.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 pr-4 text-gray-400">
                      {sorted.length - i}
                    </td>
                    <td className="py-3 pr-4 font-mono text-gray-900">
                      {sub.email}
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(sub.subscribed_at).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
