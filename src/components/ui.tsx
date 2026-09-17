import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variante = "primary" | "secondary" | "danger" | "ghost" | "accent";
type Taille = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan disabled:pointer-events-none disabled:opacity-50";
const VARIANTES: Record<Variante, string> = {
  primary: "bg-navy-800 text-white hover:bg-navy-700",
  secondary: "border border-slate-300 bg-white text-navy-900 hover:bg-slate-50",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
  ghost: "text-navy-800 hover:bg-navy-50",
  accent: "bg-brand-cyan text-navy-950 hover:bg-brand-cyan-dark hover:text-white",
};
const TAILLES: Record<Taille, string> = { sm: "h-8 px-3 text-xs", md: "h-10 px-4 text-sm" };

export function classesBouton(variante: Variante = "primary", taille: Taille = "md", extra = ""): string {
  return `${BASE} ${VARIANTES[variante]} ${TAILLES[taille]} ${extra}`;
}

export function Button({
  variante = "primary",
  taille = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variante?: Variante; taille?: Taille }) {
  return <button className={classesBouton(variante, taille, className)} {...props} />;
}

export function ButtonLink({
  variante = "primary",
  taille = "md",
  className = "",
  href,
  children,
  ...props
}: ComponentProps<typeof Link> & { variante?: Variante; taille?: Taille }) {
  return (
    <Link href={href} className={classesBouton(variante, taille, className)} {...props}>
      {children}
    </Link>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</section>;
}

export function CardHeader({ titre, description, actions }: { titre: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-base font-semibold text-navy-900">{titre}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
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
  sousTitre,
  actions,
  retour,
}: {
  titre: ReactNode;
  sousTitre?: ReactNode;
  actions?: ReactNode;
  retour?: { href: string; libelle: string };
}) {
  return (
    <div className="mb-6">
      {retour && (
        <Link href={retour.href} className="mb-2 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-navy-800">
          ← {retour.libelle}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{titre}</h1>
          {sousTitre && <div className="mt-1 text-sm text-slate-500">{sousTitre}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

type Ton = "gris" | "vert" | "orange" | "rouge" | "bleu" | "violet" | "cyan";
const TONS: Record<Ton, string> = {
  gris: "bg-slate-100 text-slate-700",
  vert: "bg-emerald-100 text-emerald-800",
  orange: "bg-amber-100 text-amber-800",
  rouge: "bg-red-100 text-red-800",
  bleu: "bg-navy-100 text-navy-800",
  violet: "bg-violet-100 text-violet-800",
  cyan: "bg-cyan-100 text-cyan-900",
};

export function Badge({ ton = "gris", children }: { ton?: Ton; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONS[ton]}`}>{children}</span>;
}

export function Alerte({ ton = "bleu", titre, children }: { ton?: "bleu" | "vert" | "orange" | "rouge"; titre?: ReactNode; children?: ReactNode }) {
  const styles = {
    bleu: "border-navy-200 bg-navy-50 text-navy-900",
    vert: "border-emerald-200 bg-emerald-50 text-emerald-900",
    orange: "border-amber-200 bg-amber-50 text-amber-900",
    rouge: "border-red-200 bg-red-50 text-red-900",
  }[ton];
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role={ton === "rouge" ? "alert" : undefined}>
      {titre && <p className="font-semibold">{titre}</p>}
      {children && <div className={titre ? "mt-1" : ""}>{children}</div>}
    </div>
  );
}

export function EmptyState({ titre, description, action }: { titre: ReactNode; description?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-base font-semibold text-navy-900">{titre}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Liste de définitions (label / valeur) pour les pages de détail. */
export function Infos({ items, colonnes = 2 }: { items: { label: ReactNode; valeur: ReactNode }[]; colonnes?: 1 | 2 | 3 }) {
  const grille = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[colonnes];
  return (
    <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 ${grille}`}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm text-navy-950">{it.valeur ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tableau({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className = "", droite = false }: { children?: ReactNode; className?: string; droite?: boolean }) {
  return (
    <th scope="col" className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 ${droite ? "text-right" : "text-left"} ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, className = "", droite = false }: { children?: ReactNode; className?: string; droite?: boolean }) {
  return <td className={`px-4 py-2.5 align-top ${droite ? "text-right tabular-nums" : ""} ${className}`}>{children}</td>;
}

export function Stat({ libelle, valeur, detail, ton = "gris" }: { libelle: ReactNode; valeur: ReactNode; detail?: ReactNode; ton?: Ton }) {
  const bordure = { gris: "border-slate-200", vert: "border-emerald-300", orange: "border-amber-300", rouge: "border-red-300", bleu: "border-navy-300", violet: "border-violet-300", cyan: "border-cyan-300" }[ton];
  return (
    <div className={`rounded-xl border-l-4 bg-white p-4 shadow-sm ${bordure}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{libelle}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-navy-900">{valeur}</p>
      {detail && <p className="mt-0.5 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}
