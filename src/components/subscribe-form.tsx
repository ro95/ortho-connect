"use client";

import { useState, type FormEvent } from "react";
import { ArrowRightIcon, CheckCircleIcon } from "./icons";

type Status = "idle" | "loading" | "success" | "error";

export default function SubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(data.message ?? "Inscription réussie !");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Une erreur est survenue.");
      }
    } catch {
      setStatus("error");
      setMessage("Impossible de joindre le serveur. Réessayez.");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-2xl bg-accent-500/10 px-6 py-4 text-accent-600 animate-fade-in-up">
        <CheckCircleIcon className="w-6 h-6 shrink-0" />
        <p className="text-sm font-medium">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="flex rounded-2xl border border-gray-200 bg-white shadow-lg shadow-primary-900/5 transition-shadow focus-within:shadow-xl focus-within:border-primary-300">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="votre@email.fr"
          className="flex-1 bg-transparent px-5 py-4 text-sm outline-none placeholder:text-gray-400"
          aria-label="Adresse email"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="m-1.5 flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-700 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {status === "loading" ? (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <>
              Je m&apos;inscris
              <ArrowRightIcon />
            </>
          )}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-2 text-sm text-red-500 pl-5 animate-fade-in-up">{message}</p>
      )}

      <p className="mt-3 text-xs text-gray-400 pl-5">
        Pas de spam. Juste un email au lancement.
      </p>
    </form>
  );
}
