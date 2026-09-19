import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { TableauResponsive } from "./tableau-responsive";

/* ------------------------------------------------------------------ */
/* Boutons                                                             */
/* ------------------------------------------------------------------ */

export type Variante = "primary" | "secondary" | "danger" | "dangerPlein" | "ghost" | "accent";
export type Taille = "sm" | "md" | "lg";

const BASE =
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:pointer-events-none disabled:opacity-50";
const VARIANTES: Record<Variante, string> = {
  primary: "bg-navy-800 font-semibold text-white hover:bg-navy-700",
  secondary: "border border-slate-300 bg-white font-medium text-navy-900 hover:bg-slate-50",
  accent: "bg-brand-cyan font-semibold text-navy-950 hover:bg-brand-cyan-dark hover:text-white",
  ghost: "font-semibold text-navy-800 hover:bg-navy-50",
  danger: "border border-red-200 bg-white font-medium text-red-700 hover:bg-red-50",
  dangerPlein: "bg-red-600 font-semibold text-white hover:bg-red-700",
};
const TAILLES: Record<Taille, string> = { sm: "h-8 rounded-md px-3 text-[13px]", md: "h-10 rounded-lg px-4 text-sm", lg: "h-11 rounded-lg px-4 text-sm" };

export function classesBouton(variante: Variante = "primary", taille: Taille = "md", extra = ""): string {
  return `${BASE} ${VARIANTES[variante]} ${TAILLES[taille]} ${extra}`;
}

export function Button({ variante = "primary", taille = "md", className = "", ...props }: ComponentProps<"button"> & { variante?: Variante; taille?: Taille }) {
  return <button className={classesBouton(variante, taille, className)} {...props} />;
}

export function ButtonLink({ variante = "primary", taille = "md", className = "", href, children, ...props }: ComponentProps<typeof Link> & { variante?: Variante; taille?: Taille }) {
  return (
    <Link href={href} className={classesBouton(variante, taille, className)} {...props}>
      {children}
    </Link>
  );
}

/** Anneau de chargement (boutons en cours d'envoi). */
export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`} />;
}

const ICONE_BASE = "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border bg-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:pointer-events-none disabled:opacity-50";
const ICONE_VARIANTES = { neutre: "border-slate-200 text-slate-600 hover:bg-slate-50", danger: "border-red-200 text-red-700 hover:bg-red-50" };
const ICONE_TAILLES = { sm: "h-8 w-8", md: "h-9 w-9" };

/** Bouton carré ne contenant qu'une icône (donner un aria-label). */
export function IconButton({ variante = "neutre", taille = "md", className = "", ...props }: ComponentProps<"button"> & { variante?: "neutre" | "danger"; taille?: "sm" | "md" }) {
  return <button type="button" className={`${ICONE_BASE} ${ICONE_VARIANTES[variante]} ${ICONE_TAILLES[taille]} ${className}`} {...props} />;
}

export function IconLink({ variante = "neutre", taille = "md", className = "", href, children, ...props }: ComponentProps<typeof Link> & { variante?: "neutre" | "danger"; taille?: "sm" | "md" }) {
  return (
    <Link href={href} className={`${ICONE_BASE} ${ICONE_VARIANTES[variante]} ${ICONE_TAILLES[taille]} ${className}`} {...props}>
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Cartes et en-têtes                                                  */
/* ------------------------------------------------------------------ */

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-card ${className}`}>{children}</section>;
}

export function CardHeader({ titre, description, actions }: { titre: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-navy-900">{titre}</h2>
        {description && <p className="mt-0.5 text-[13px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

export function PageHeader({
  titre,
  badge,
  sousTitre,
  actions,
  retour,
}: {
  titre: ReactNode;
  /** Badge de statut affiché à droite du titre. */
  badge?: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  retour?: { href: string; libelle: string };
}) {
  return (
    <div className="mb-6">
      {retour && (
        <Link href={retour.href} className="text-[13px] text-slate-500 hover:text-navy-800">
          ← {retour.libelle}
        </Link>
      )}
      <div className={`flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between ${retour ? "mt-2" : ""}`}>
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-[-0.02em] text-navy-900">
            <span>{titre}</span>
            {badge}
          </h1>
          {sousTitre && <div className="mt-1 text-sm text-slate-600">{sousTitre}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badges, alertes, états vides                                        */
/* ------------------------------------------------------------------ */

export type Ton = "gris" | "vert" | "orange" | "rouge" | "bleu" | "violet" | "cyan";
const TONS: Record<Ton, string> = {
  gris: "bg-slate-100 text-slate-700",
  vert: "bg-emerald-100 text-emerald-800",
  orange: "bg-amber-100 text-amber-800",
  rouge: "bg-red-100 text-red-800",
  bleu: "bg-navy-100 text-navy-800",
  violet: "bg-violet-100 text-violet-800",
  cyan: "bg-cyan-100 text-cyan-900",
};

export function Badge({ ton = "gris", children, className = "" }: { ton?: Ton; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONS[ton]} ${className}`}>{children}</span>;
}

/** Point coloré (listes « À faire », indicateurs). */
export function Pastille({ ton = "gris", className = "" }: { ton?: Ton; className?: string }) {
  const c = { gris: "bg-slate-400", vert: "bg-emerald-500", orange: "bg-amber-500", rouge: "bg-red-600", bleu: "bg-navy-500", violet: "bg-violet-600", cyan: "bg-brand-cyan" }[ton];
  return <span aria-hidden="true" className={`inline-block h-2 w-2 shrink-0 rounded-full ${c} ${className}`} />;
}

export function Alerte({ ton = "bleu", titre, children, className = "" }: { ton?: "bleu" | "vert" | "orange" | "rouge"; titre?: ReactNode; children?: ReactNode; className?: string }) {
  const styles = {
    bleu: "border-navy-200 bg-navy-50 text-navy-800",
    vert: "border-emerald-200 bg-emerald-50 text-emerald-800",
    orange: "border-amber-200 bg-amber-50 text-amber-800",
    rouge: "border-red-200 bg-red-50 text-red-900",
  }[ton];
  return (
    <div className={`rounded-lg border px-3.5 py-2.5 text-sm ${styles} ${className}`} role={ton === "rouge" ? "alert" : undefined}>
      {titre && <p className="font-bold">{titre}</p>}
      {children && <div className={titre ? "mt-0.5" : ""}>{children}</div>}
    </div>
  );
}

export function EmptyState({ titre, description, action, className = "" }: { titre: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center ${className}`}>
      <p className="text-base font-bold text-navy-900">{titre}</p>
      {description && <p className="mx-auto mt-1.5 max-w-[420px] text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Données : listes de définitions, tableaux, KPI                      */
/* ------------------------------------------------------------------ */

/** Liste de définitions (libellé / valeur) pour les pages de détail. */
export function Infos({ items, colonnes = 2, className = "" }: { items: { label: ReactNode; valeur: ReactNode }[]; colonnes?: 1 | 2 | 3; className?: string }) {
  const grille = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[colonnes];
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3.5 ${grille} ${className}`}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-900 tabular-nums">{it.valeur ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Tableau : défilement horizontal sur écran large ; sur téléphone, chaque ligne devient une carte (voir TableauResponsive). */
export function Tableau({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <TableauResponsive className={className}>
      <table className="w-full min-w-full text-sm">{children}</table>
    </TableauResponsive>
  );
}

export function Th({ children, className = "", droite = false }: { children?: ReactNode; className?: string; droite?: boolean }) {
  return (
    <th scope="col" className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500 ${droite ? "text-right" : "text-left"} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", droite = false }: { children?: ReactNode; className?: string; droite?: boolean }) {
  return <td className={`px-4 py-3 align-top ${droite ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

/** Pied de tableau : compteur à gauche, pagination (désactivée tant que tout tient sur une page) à droite. */
export function TableauPied({ children, pagination = true, className = "" }: { children: ReactNode; pagination?: boolean; className?: string }) {
  const bouton = "h-8 rounded-md border border-slate-200 bg-white px-2.5 text-[13px] text-slate-400";
  return (
    <div className={`flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-2.5 text-[13px] text-slate-500 ${className}`}>
      <span>{children}</span>
      {pagination && (
        <div className="flex gap-1">
          <button type="button" disabled className={bouton}>Précédent</button>
          <button type="button" disabled className={bouton}>Suivant</button>
        </div>
      )}
    </div>
  );
}

const STAT_BORDURES: Record<Ton, string> = {
  gris: "",
  vert: "border-t-[3px] border-t-emerald-500",
  orange: "border-t-[3px] border-t-amber-500",
  rouge: "border-t-[3px] border-t-red-600",
  bleu: "border-t-[3px] border-t-navy-500",
  violet: "border-t-[3px] border-t-violet-500",
  cyan: "border-t-[3px] border-t-brand-cyan",
};

/** Indicateur clé (KPI). `sombre` : variante bleu nuit (résultat, loyer mensuel). */
export function Stat({ libelle, valeur, detail, ton = "gris", sombre = false, className = "" }: { libelle: ReactNode; valeur: ReactNode; detail?: ReactNode; ton?: Ton; sombre?: boolean; className?: string }) {
  if (sombre) {
    return (
      <div className={`rounded-xl bg-navy-900 px-5 py-[18px] text-white ${className}`}>
        <p className="text-xs font-semibold uppercase tracking-[.04em] text-navy-300">{libelle}</p>
        <p className="mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] tabular-nums">{valeur}</p>
        {detail && <p className="mt-1 text-[13px] text-navy-200">{detail}</p>}
      </div>
    );
  }
  return (
    <div className={`rounded-xl border border-slate-200 bg-white px-5 py-[18px] shadow-card ${STAT_BORDURES[ton]} ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{libelle}</p>
      <p className={`mt-1.5 text-[28px] font-bold leading-tight tracking-[-0.02em] tabular-nums ${ton === "rouge" ? "text-red-700" : "text-navy-900"}`}>{valeur}</p>
      {detail && <p className="mt-1 text-[13px] text-slate-500">{detail}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation locale : étapes, onglets, segments, filtres              */
/* ------------------------------------------------------------------ */

/** Suivi d'avancement (statut d'un bail : Brouillon → En signature → Signé → Terminé). */
export function Stepper({ etapes, courant, className = "" }: { etapes: string[]; courant: number; className?: string }) {
  return (
    <ol className={`grid gap-2 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-card ${className}`} style={{ gridTemplateColumns: `repeat(${etapes.length}, minmax(0, 1fr))` }}>
      {etapes.map((libelle, i) => {
        const fait = i < courant;
        const cour = i === courant;
        return (
          <li key={libelle} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${fait ? "bg-emerald-100 text-emerald-800" : cour ? "bg-navy-800 text-white ring-4 ring-navy-100" : "bg-slate-100 text-slate-400"}`}>{fait ? "✓" : i + 1}</span>
              {i < etapes.length - 1 && <span aria-hidden="true" className={`h-0.5 flex-1 rounded-full ${fait ? "bg-emerald-300" : "bg-slate-200"}`} />}
            </div>
            <span className={`text-[13px] leading-tight ${cour ? "font-bold text-navy-900" : fait ? "text-slate-600" : "text-slate-400"}`}>{libelle}</span>
          </li>
        );
      })}
    </ol>
  );
}

export type OngletItem = { href: string; libelle: string; actif?: boolean };

/** Onglets soulignés (fiche bail, calculatrices) : liens vers des pages ou des paramètres d'URL. */
export function Onglets({ items, className = "" }: { items: OngletItem[]; className?: string }) {
  return (
    <div role="tablist" className={`flex gap-1 overflow-x-auto border-b border-slate-100 px-3 max-sm:flex-wrap max-sm:gap-0 ${className}`}>
      {items.map((it) => (
        <Link
          key={it.href + it.libelle}
          href={it.href}
          role="tab"
          aria-selected={!!it.actif}
          scroll={false}
          className={`flex h-11 shrink-0 items-center whitespace-nowrap px-3.5 text-sm max-sm:h-10 max-sm:px-2.5 ${it.actif ? "font-bold text-navy-900 shadow-[inset_0_-2px_0_#172c52]" : "font-medium text-slate-500 hover:text-navy-900"}`}
        >
          {it.libelle}
        </Link>
      ))}
    </div>
  );
}

/** Sélecteur segmenté (filtres de statut) : pilules dans un cadre blanc, l'actif en bleu nuit. */
export function Segments({ items, className = "" }: { items: OngletItem[]; className?: string }) {
  return (
    <div role="tablist" className={`inline-flex flex-wrap gap-0.5 rounded-lg border border-slate-200 bg-white p-[3px] ${className}`}>
      {items.map((it) => (
        <Link
          key={it.href + it.libelle}
          href={it.href}
          role="tab"
          aria-selected={!!it.actif}
          scroll={false}
          className={`inline-flex h-[34px] items-center rounded-md px-3.5 text-[13px] font-semibold ${it.actif ? "bg-navy-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}
        >
          {it.libelle}
        </Link>
      ))}
    </div>
  );
}

/** Barre de filtres (sélecteurs, recherche, segments) au-dessus d'une liste. */
export function Filtres({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mb-6 flex flex-wrap items-center gap-2 ${className}`}>{children}</div>;
}
