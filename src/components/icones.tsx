import type { ReactNode, SVGProps } from "react";

/** Icônes linéaires 24×24 (trait 1,8) dessinées pour OMNIUP Location — aucune bibliothèque externe. */
type Props = SVGProps<SVGSVGElement> & { taille?: number };

function Svg({ taille = 18, children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {children}
    </svg>
  );
}

export const IconeTableauDeBord = (p: Props) => <Svg {...p}><rect x="3" y="3" width="8" height="8" rx="1.5" /><rect x="13" y="3" width="8" height="5" rx="1.5" /><rect x="13" y="12" width="8" height="9" rx="1.5" /><rect x="3" y="15" width="8" height="6" rx="1.5" /></Svg>;
export const IconeBailleur = (p: Props) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></Svg>;
export const IconeImmeuble = (p: Props) => <Svg {...p}><path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 9h3a1 1 0 0 1 1 1v11M8 8h2M8 12h2M8 16h2" /></Svg>;
export const IconeLot = (p: Props) => <Svg {...p}><path d="M4 21V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16M2 21h20M15 12h.01" /></Svg>;
export const IconeLocataires = (p: Props) => <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 13.5a6.5 6.5 0 0 1 3.5 6.5" /></Svg>;
export const IconeBail = (p: Props) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></Svg>;
export const IconeEuro = (p: Props) => <Svg {...p}><path d="M18 6.5A7 7 0 0 0 6.5 9M18 17.5A7 7 0 0 1 6.5 15M4 11h9M4 14h9" /></Svg>;
export const IconeDocuments = (p: Props) => <Svg {...p}><path d="M16 3H9a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z" /><path d="M4 8v11a2 2 0 0 0 2 2h9" /></Svg>;
export const IconeModeles = (p: Props) => <Svg {...p}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M9 10v10" /></Svg>;
export const IconeDepenses = (p: Props) => <Svg {...p}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" /><path d="M9 8h6M9 12h6" /></Svg>;
export const IconeEmprunts = (p: Props) => <Svg {...p}><path d="M3 9l9-5 9 5M4 21h16M6 10v8M10 10v8M14 10v8M18 10v8" /></Svg>;
export const IconeSynthese = (p: Props) => <Svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
export const IconeCalculatrice = (p: Props) => <Svg {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></Svg>;
export const IconeIA = (p: Props) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></Svg>;
export const IconeEtincelle = (p: Props) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></Svg>;
export const IconeParametres = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></Svg>;
export const IconeEntites = (p: Props) => <Svg {...p}><path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /></Svg>;
export const IconeMenu = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M4 7h16M4 12h16M4 17h16" /></Svg>;
export const IconeFermer = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const IconeChevronDroite = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M9 6l6 6-6 6" /></Svg>;
export const IconeChevronBas = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const IconeChevronsVertical = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M7 15l5 5 5-5M7 9l5-5 5 5" /></Svg>;
export const IconeRetour = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const IconeEnvoyer = (p: Props) => <Svg {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Svg>;
export const IconeTelecharger = (p: Props) => <Svg {...p}><path d="M12 3v12M6 11l6 6 6-6M4 21h16" /></Svg>;
export const IconeImporter = (p: Props) => <Svg strokeWidth={1.6} {...p}><path d="M12 16V4M6 10l6-6 6 6M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></Svg>;
export const IconeApercu = (p: Props) => <Svg {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></Svg>;
export const IconeSupprimer = (p: Props) => <Svg {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></Svg>;
export const IconeFichier = (p: Props) => <Svg {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></Svg>;
export const IconeCocheCercle = (p: Props) => <Svg strokeWidth={2} {...p}><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></Svg>;
export const IconeFlecheHaut = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M12 19V5M5 12l7-7 7 7" /></Svg>;
export const IconePlus = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const IconeStockage = (p: Props) => <Svg {...p}><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" /></Svg>;
export const IconeHorloge = (p: Props) => <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>;
export const IconeOcr = (p: Props) => <Svg {...p}><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10" /></Svg>;
export const IconeSignature = (p: Props) => <Svg {...p}><path d="M3 17c3-4 5-6 6-4s-1 5 1 5 3-4 5-4 2 3 6 1M14 5l3 3-8 8H6v-3z" /></Svg>;
export const IconeCoche = (p: Props) => <Svg strokeWidth={2} {...p}><path d="M5 12l4 4 10-10" /></Svg>;
export const IconeMotDePasse = (p: Props) => <Svg {...p}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Svg>;
