"use client";

import { useRef } from "react";

/**
 * Numéro de version incrémenté à chaque changement de `dep` (typiquement l'état renvoyé par useActionState).
 * Sert de `key` à un formulaire : React 19 réinitialise le formulaire après chaque action, ce qui désynchronise
 * les <select> et boutons radio contrôlés (leur état par défaut n'est pas mis à jour) ; le remonter les resynchronise.
 */
export function useVersion(dep: unknown): number {
  const ref = useRef({ dep, n: 0 });
  if (ref.current.dep !== dep) ref.current = { dep, n: ref.current.n + 1 };
  return ref.current.n;
}
