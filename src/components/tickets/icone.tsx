import type { SVGProps } from "react";

/** Bouée de sauvetage : icône de l'assistance (même trait que les icônes de components/icones.tsx). */
export function IconeAide({ taille = 18, ...props }: SVGProps<SVGSVGElement> & { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="m5.6 5.6 3.8 3.8M14.6 14.6l3.8 3.8M18.4 5.6l-3.8 3.8M9.4 14.6l-3.8 3.8" />
    </svg>
  );
}
