import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "subscribers.json");

/** Simple email regex — good enough for an MVP. */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

interface Subscriber {
  email: string;
  subscribedAt: string;
}

async function readSubscribers(): Promise<Subscriber[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as Subscriber[];
  } catch {
    return [];
  }
}

async function writeSubscribers(subscribers: Subscriber[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(subscribers, null, 2), "utf-8");
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
    await fetch("https://api.resend.com/emails", {
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
  } catch (err) {
    console.error("Resend notification failed:", err);
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

    const subscribers = await readSubscribers();

    if (subscribers.some((s) => s.email === email)) {
      return NextResponse.json(
        { message: "Vous êtes déjà inscrit — on vous tient au courant !" },
        { status: 200 },
      );
    }

    subscribers.push({ email, subscribedAt: new Date().toISOString() });
    await writeSubscribers(subscribers);
    await Promise.all([
      notifySlack(email, subscribers.length),
      notifyEmail(email, subscribers.length),
    ]);

    return NextResponse.json(
      { message: "Parfait ! Vous serez parmi les premiers informés." },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 },
    );
  }
}
