"use client";

import { useRef, useState, type FormEvent } from "react";
import { ArrowRightIcon, CheckCircleIcon } from "./icons";

type Status = "idle" | "loading" | "success" | "error";

interface Props {
  /**
   * Secteur d'où provient l'inscription (« Toulouse (31) », « Remplacement »…).
   * Transmis avec l'email pour savoir quelles zones convertissent — c'est le seul
   * moyen de mesurer le rendement réel des pages géographiques.
   */
  zone?: string;
}

export default function SubscribeForm({ zone }: Props = {}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  /**
   * Piège à robots : champ caché que personne ne voit et que seul un script
   * remplit. Sa valeur part avec la requête, le serveur y répond par un faux
   * succès.
   */
  const [honeypot, setHoneypot] = useState("");

  /**
   * Instant du premier rendu. L'écart avec l'envoi permet au serveur d'écarter
   * les soumissions instantanées, hors de portée d'une saisie humaine.
   */
  const monteA = useRef(Date.now());

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          zone,
          website: honeypot,
          delaiMs: Date.now() - monteA.current,
        }),
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
      {/*
        Honeypot. `sr-only` le sort du flux visuel par découpe, sans recourir à
        `display: none` que certains robots savent détecter. aria-hidden et
        tabIndex -1 le rendent inatteignable au clavier comme au lecteur
        d'écran, malgré ce que le nom de la classe suggère.
      */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

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
