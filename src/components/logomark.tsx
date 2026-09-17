/** Marque OMNIUP : le disque « bouton d'allumage » (cyan, glyphe blanc), tourne à 180° au survol comme sur le site. */
export function Logomark({ taille = 34, className = "" }: { taille?: number; className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-cyan text-white transition-transform duration-300 hover:rotate-180 ${className}`}
      style={{ width: taille, height: taille }}
      aria-hidden="true"
    >
      <svg width={Math.round(taille * 0.58)} height={Math.round(taille * 0.58)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round">
        <path d="M12 4v8" />
        <path d="M7.5 7a7 7 0 1 0 9 0" />
      </svg>
    </span>
  );
}

export function Marque({ sombre = true, tailleLogo = 34 }: { sombre?: boolean; tailleLogo?: number }) {
  return (
    <span className="flex items-center gap-3">
      <Logomark taille={tailleLogo} />
      <span className="leading-[1.15]">
        <span className={`block text-base font-extrabold tracking-[-0.02em] ${sombre ? "text-white" : "text-navy-900"}`}>OMNIUP</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[.14em] text-brand-cyan">Location</span>
      </span>
    </span>
  );
}
