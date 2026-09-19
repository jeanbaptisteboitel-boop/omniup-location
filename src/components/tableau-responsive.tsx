"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Conteneur de tableau : défilement horizontal sur écran large et, sur petit écran (< 640 px), chaque ligne devient une carte
 * où le libellé de colonne précède la valeur (copié depuis l'en-tête dans l'attribut data-label de chaque cellule).
 */
export function TableauResponsive({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const table = ref.current?.querySelector("table");
    if (!table) return;
    const etiqueter = () => {
      const entetes = Array.from(table.querySelectorAll(":scope > thead th, :scope > thead td")).map((th) => (th.textContent ?? "").trim());
      for (const ligne of table.querySelectorAll(":scope > tbody > tr, :scope > tfoot > tr")) {
        let i = 0;
        for (const cellule of Array.from(ligne.children) as HTMLTableCellElement[]) {
          const libelle = cellule.colSpan > 1 ? "" : (entetes[i] ?? "");
          if (libelle) cellule.setAttribute("data-label", libelle);
          else cellule.removeAttribute("data-label");
          i += cellule.colSpan || 1;
        }
      }
    };
    etiqueter();
    const observateur = new MutationObserver(etiqueter);
    observateur.observe(table, { childList: true, subtree: true });
    return () => observateur.disconnect();
  }, []);
  return (
    <div ref={ref} className={`tableau-cartes overflow-x-auto ${className}`}>
      {children}
    </div>
  );
}
