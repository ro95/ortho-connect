import { getSupabase } from "./supabase";

/**
 * Consomme un jeton de quota pour `cle`.
 *
 * Retourne true si l'appel est autorisé. En cas d'erreur base (migration 004
 * non appliquée, Supabase indisponible…) on ouvre le passage plutôt que de
 * bloquer : le quota protège d'un abus, il ne doit pas casser les inscriptions
 * légitimes s'il tombe.
 */
export async function consommeQuota(
  cle: string,
  limite: number,
  fenetreSecondes: number,
): Promise<boolean> {
  try {
    const { data, error } = await getSupabase().rpc("consomme_quota", {
      p_cle: cle,
      p_limite: limite,
      p_fenetre_secondes: fenetreSecondes,
    });

    if (error) {
      console.error("[rate-limit] rpc error:", error);
      return true;
    }

    return data !== false;
  } catch (err) {
    console.error("[rate-limit] exception:", err);
    return true;
  }
}

/**
 * IP de l'appelant d'après les en-têtes du reverse proxy (Vercel).
 *
 * Retourne null si aucun en-tête exploitable : mieux vaut ne pas limiter que de
 * ranger tous les visiteurs anonymes sous une même clé, ce qui reviendrait à
 * les bloquer collectivement.
 */
export function ipDepuisRequete(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const premiere = forwarded.split(",")[0]?.trim();
    if (premiere) return premiere.slice(0, 45); // longueur max d'une IPv6
  }

  const reel = request.headers.get("x-real-ip")?.trim();
  return reel ? reel.slice(0, 45) : null;
}
