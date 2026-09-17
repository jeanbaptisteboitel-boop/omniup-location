"use client";

import type { ReactNode } from "react";

/**
 * Formulaire de filtres (méthode GET) : les listes déroulantes soumettent dès le changement,
 * les champs de recherche à la validation (Entrée). Les paramètres arrivent dans searchParams.
 */
export function FiltresForm({ children, action, className = "" }: { children: ReactNode; action?: string; className?: string }) {
  return (
    <form
      method="get"
      action={action}
      className={`flex flex-wrap items-center gap-2 ${className}`}
      onChange={(e) => {
        if ((e.target as HTMLElement).tagName === "SELECT") e.currentTarget.requestSubmit();
      }}
    >
      {children}
    </form>
  );
}
