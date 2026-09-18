"use client";

import type { ReactNode } from "react";
import { classesBouton } from "@/components/ui";

/**
 * Bouton qui conduit au bloc d'envoi par email correspondant (avis ou quittance) :
 * il déplie le bloc, y fait défiler la page et place le focus sur l'objet du message.
 * `className` remplace entièrement les classes du bouton (accent par défaut).
 */
export function BoutonEnvoi({ cible, className, children }: { cible: string; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      className={className ?? classesBouton("accent")}
      onClick={() => {
        const bloc = document.getElementById(cible);
        if (!bloc) return;
        const details = bloc.querySelector("details");
        if (details) details.open = true;
        bloc.scrollIntoView({ behavior: "smooth", block: "start" });
        const objet = bloc.querySelector<HTMLInputElement>("input[name=objet]");
        if (objet) window.setTimeout(() => objet.focus({ preventScroll: true }), 350);
      }}
    >
      {children}
    </button>
  );
}
