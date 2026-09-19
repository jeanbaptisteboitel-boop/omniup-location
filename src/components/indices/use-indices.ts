"use client";

import { useEffect, useState } from "react";
import { chargerIndices } from "@/actions/indices";
import type { CodeIndice } from "@/lib/calculs";
import type { SerieIndice } from "@/lib/insee/utils";

export type EtatIndices = { statut: "inactif" | "chargement" | "ok" | "erreur"; serie: SerieIndice | null; erreur: string | null };

/** Derniers trimestres publiés par l'INSEE pour un indice, chargés dès que le composant est affiché (ou sur demande). */
export function useIndicesINSEE(code: CodeIndice, actif = true): EtatIndices {
  const [etat, setEtat] = useState<EtatIndices>({ statut: actif ? "chargement" : "inactif", serie: null, erreur: null });
  useEffect(() => {
    if (!actif) {
      setEtat({ statut: "inactif", serie: null, erreur: null });
      return;
    }
    let annule = false;
    setEtat({ statut: "chargement", serie: null, erreur: null });
    chargerIndices(code)
      .then((r) => {
        if (annule) return;
        setEtat(r.ok ? { statut: "ok", serie: r.serie, erreur: null } : { statut: "erreur", serie: null, erreur: r.erreur });
      })
      .catch((e: unknown) => {
        if (!annule) setEtat({ statut: "erreur", serie: null, erreur: e instanceof Error ? e.message : "Erreur inattendue." });
      });
    return () => {
      annule = true;
    };
  }, [code, actif]);
  return etat;
}
