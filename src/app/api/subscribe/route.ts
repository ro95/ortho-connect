import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function notifySlack(email: string, total: number): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `:tada: Nouvelle inscription Ortho-Connect\n• *${email}*\n• Total inscrits : ${total}`,
      }),
    });
  } catch (err) {
    console.error("Slack notification failed:", err);
  }
}

async function notifyEmail(email: string, total: number): Promise<void> {
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
          <p><strong>Email :</strong> ${email}</p>
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

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Adresse email invalide." },
        { status: 400 },
      );
    }

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

    if (existing) {
      return NextResponse.json(
        { message: "Vous êtes déjà inscrit — on vous tient au courant !" },
        { status: 200 },
      );
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

    await Promise.all([
      notifySlack(email, count ?? 0),
      notifyEmail(email, count ?? 0),
    ]);

    return NextResponse.json(
      { message: "Parfait ! Vous serez parmi les premiers informés." },
      { status: 201 },
    );
  } catch (err) {
    console.error("[subscribe] exception:", err);
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
