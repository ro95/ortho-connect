import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { consommeQuota, ipDepuisRequete } from "@/lib/rate-limit";

/**
 * Message unique de succès.
 *
 * Renvoyé à l'identique que l'email soit nouveau ou déjà connu : un message
 * distinct pour « déjà inscrit » permettrait à n'importe qui de tester la
 * présence d'une adresse dans la liste. Sur une audience de professionnels de
 * santé identifiables, c'est une fuite de données personnelles.
 */
const MESSAGE_SUCCES = "Parfait ! Vous serez parmi les premiers informés.";

/** Délai minimum entre l'affichage du formulaire et son envoi. */
const DELAI_HUMAIN_MS = 2000;

/** Quota par IP : 3 inscriptions par tranche de 10 minutes. */
const QUOTA_IP = { limite: 3, fenetre: 600 };

/**
 * Plafond global de notifications sortantes, par heure.
 *
 * Dernier rempart : même si un flot d'inscriptions passe les autres filtres, il
 * ne doit pas vider le quota Resend (100 mails/jour en offre gratuite) ni noyer
 * le canal Slack. Les inscriptions continuent d'être enregistrées, seules les
 * notifications s'arrêtent.
 */
const QUOTA_NOTIFICATIONS = { limite: 30, fenetre: 3600 };

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Vrai si la requête présente une signature de robot.
 *
 * Deux pièges passifs, invisibles pour l'utilisateur :
 *  - le honeypot `website`, champ caché que seul un script remplit ;
 *  - le délai de saisie, qu'un envoi automatisé ne prend pas.
 * Aucun des deux n'arrête un attaquant décidé — ils éliminent le bruit de fond
 * des bots de formulaire sans coût de conversion, ce qu'un captcha ne fait pas.
 */
function ressembleAUnBot(body: Record<string, unknown>): boolean {
  if (typeof body.website === "string" && body.website.trim().length > 0) {
    return true;
  }

  const delai = body.delaiMs;
  return typeof delai === "number" && Number.isFinite(delai) && delai < DELAI_HUMAIN_MS;
}

/**
 * Le secteur provient du corps de la requête, donc du client : il est nettoyé et
 * borné avant d'être renvoyé dans une notification.
 */
function sanitizeZone(valeur: unknown): string | null {
  if (typeof valeur !== "string") return null;
  const propre = valeur.trim().slice(0, 80);
  return propre.length > 0 ? propre : null;
}

/** Échappement HTML : ces valeurs finissent dans le corps d'un email. */
function escapeHtml(valeur: string): string {
  return valeur
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function notifySlack(email: string, total: number, zone: string | null): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text:
          `:tada: Nouvelle inscription Ortho-Connect\n• *${email}*\n` +
          (zone ? `• Secteur : ${zone}\n` : "") +
          `• Total inscrits : ${total}`,
      }),
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}

async function notifyEmail(email: string, total: number, zone: string | null): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const to = process.env.RESEND_TO;

  if (!apiKey || !from || !to) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Nouvelle inscription Ortho-Connect (${total})`,
        html: `
          <h2>Nouvelle inscription</h2>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          ${zone ? `<p><strong>Secteur :</strong> ${escapeHtml(zone)}</p>` : ""}
          <p><strong>Total inscrits :</strong> ${total}</p>
          <p><small>Reçu le ${new Date().toLocaleString("fr-FR")}</small></p>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[Resend] Erreur ${res.status} :`, body);
    }
  } catch (err) {
    console.error("[Resend] Exception :", err);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email: string = (body.email ?? "").toLowerCase().trim();
    const zone = sanitizeZone(body.zone);

    // Succès simulé : un bot qui reçoit une erreur ajuste sa charge, un bot qui
    // reçoit un succès passe au formulaire suivant.
    if (ressembleAUnBot(body)) {
      return NextResponse.json({ message: MESSAGE_SUCCES }, { status: 200 });
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 },
      );
    }

    const ip = ipDepuisRequete(request);
    if (ip && !(await consommeQuota(`subscribe:ip:${ip}`, QUOTA_IP.limite, QUOTA_IP.fenetre))) {
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        { status: 429 },
      );
    }

    const supabase = getSupabase();

    const { data: existing, error: selectError } = await supabase
      .from("subscribers")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (selectError) {
      console.error("[Supabase] select error:", selectError);
      return NextResponse.json(
        { error: "Erreur serveur. Réessayez dans un instant." },
        { status: 500 },
      );
    }

    // Doublon traité en silence : même message, même code, aucune notification.
    if (existing) {
      return NextResponse.json({ message: MESSAGE_SUCCES }, { status: 200 });
    }

    const { error: insertError } = await supabase
      .from("subscribers")
      .insert({ email });

    if (insertError) {
      console.error("[Supabase] insert error:", insertError);
      return NextResponse.json(
        { error: "Erreur serveur. Réessayez dans un instant." },
        { status: 500 },
      );
    }

    const { count } = await supabase
      .from("subscribers")
      .select("*", { count: "exact", head: true });

    const peutNotifier = await consommeQuota(
      "subscribe:notif:global",
      QUOTA_NOTIFICATIONS.limite,
      QUOTA_NOTIFICATIONS.fenetre,
    );

    if (peutNotifier) {
      await Promise.all([
        notifySlack(email, count ?? 0, zone),
        notifyEmail(email, count ?? 0, zone),
      ]);
    } else {
      console.warn(
        `[subscribe] plafond horaire de notifications atteint — inscription de ${email} enregistrée sans alerte`,
      );
    }

    // Même code et même message qu'un doublon : voir MESSAGE_SUCCES.
    return NextResponse.json({ message: MESSAGE_SUCCES }, { status: 200 });
  } catch (err) {
    console.error("[subscribe] exception:", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
