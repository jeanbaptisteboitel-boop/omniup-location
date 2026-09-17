"use client";

import { useState } from "react";

const TONS = {
  vert: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rouge: "border-red-200 bg-red-50 text-red-900",
  bleu: "border-navy-200 bg-navy-50 text-navy-800",
  orange: "border-amber-200 bg-amber-50 text-amber-800",
};

/** Bandeau de message (succès, erreur) refermable. */
export function FlashBanner({ ton, texte }: { ton: keyof typeof TONS; texte: string }) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div role={ton === "rouge" ? "alert" : "status"} className={`flex animate-fadein items-center gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${TONS[ton]}`}>
      <span className="flex-1">{texte}</span>
      <button type="button" onClick={() => setVisible(false)} aria-label="Fermer" className="cursor-pointer rounded px-2 py-1 text-lg leading-none text-current hover:opacity-70">
        ×
      </button>
    </div>
  );
}
