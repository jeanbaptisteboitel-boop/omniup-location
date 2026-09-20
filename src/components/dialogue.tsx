"use client";

import { useEffect, type ReactNode } from "react";

/** Boîte de dialogue modale (confirmation, formulaire). Fermeture au clic sur le fond ou avec Échap ; le contenu défile s'il est trop haut. */
export function Dialogue({
  titre,
  children,
  actions,
  onFermer,
  largeur = "max-w-[440px]",
}: {
  titre: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  onFermer: () => void;
  largeur?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onFermer]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-[rgba(10,21,40,0.55)] p-4 sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      {/* La boîte défile d'elle-même quand son contenu dépasse la hauteur de l'écran (formulaires longs sur téléphone). */}
      <div className={`my-auto w-full ${largeur} max-h-[calc(100vh-2rem)] animate-fadein overflow-y-auto rounded-xl bg-white p-6 shadow-modal sm:max-h-[calc(100vh-3rem)]`}>
        <h2 className="text-lg font-bold text-navy-900">{titre}</h2>
        {children && <div className="mt-2 text-sm leading-relaxed text-slate-600">{children}</div>}
        {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </div>
  );
}
