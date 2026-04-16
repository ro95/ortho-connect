"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";

interface BentoCardProps {
  children: ReactNode;
  className?: string;
}

/** Tracks cursor position for the radial glow effect. */
export default function BentoCard({ children, className = "" }: BentoCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  function handleMouseMove(e: MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      className={`bento-card rounded-2xl border border-gray-100 bg-white p-8 ${className}`}
    >
      {children}
    </div>
  );
}
