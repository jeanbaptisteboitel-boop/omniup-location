"use client";

import type { ReactNode } from "react";
import { classesBouton } from "@/components/ui";

/** Bouton d'en-tête « Envoyer par email » : déplie le bloc d'envoi (#envoi) et y conduit. */
export function BoutonEnvoi({ children }: { children: ReactNode }) {
  return (
    <a
      href="#envoi"
      className={classesBouton("accent")}
      onClick={() => {
        const bloc = document.querySelector<HTMLDetailsElement>("#envoi details");
        if (bloc) bloc.open = true;
      }}
    >
      {children}
    </a>
  );
}
