import type { SVGProps } from "react";

/** Dossier avec une personne : icône des candidatures (même trait que les icônes de components/icones.tsx). */
export function IconeCandidature({ taille = 18, ...props }: SVGProps<SVGSVGElement> & { taille?: number }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h3.2l1.6 2H18a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 19H5.5A1.5 1.5 0 0 1 4 17.5Z" />
      <circle cx="11.8" cy="12" r="1.9" />
      <path d="M8.6 16.4a3.4 3.4 0 0 1 6.4 0" />
    </svg>
  );
}
