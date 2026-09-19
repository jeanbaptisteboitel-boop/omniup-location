"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/** Copie un texte (lien d'accès) dans le presse-papiers. */
export function BoutonCopier({ texte, libelle = "Copier" }: { texte: string; libelle?: string }) {
  const [copie, setCopie] = useState(false);
  return (
    <Button
      type="button"
      variante="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texte);
          setCopie(true);
          setTimeout(() => setCopie(false), 2000);
        } catch {
          window.prompt("Copiez ce lien :", texte);
        }
      }}
    >
      {copie ? "Copié" : libelle}
    </Button>
  );
}
