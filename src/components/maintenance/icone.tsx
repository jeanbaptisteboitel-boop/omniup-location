import type { SVGProps } from "react";

/** Clé plate : icône du menu « Maintenance » (même trait que les icônes de components/icones.tsx). */
export function IconeMaintenance({ taille = 18, ...props }: SVGProps<SVGSVGElement> & { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-8 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-8z" />
    </svg>
  );
}
