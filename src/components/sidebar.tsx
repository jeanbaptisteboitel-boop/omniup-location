import Link from "next/link";
import { NavLink } from "./nav-link";

const GROUPES: { titre: string | null; liens: { href: string; libelle: string }[] }[] = [
  { titre: null, liens: [{ href: "/", libelle: "Tableau de bord" }] },
  {
    titre: "Patrimoine",
    liens: [
      { href: "/bailleurs", libelle: "Bailleurs" },
      { href: "/immeubles", libelle: "Immeubles" },
      { href: "/lots", libelle: "Lots" },
    ],
  },
  {
    titre: "Location",
    liens: [
      { href: "/locataires", libelle: "Locataires" },
      { href: "/baux", libelle: "Baux" },
      { href: "/loyers", libelle: "Loyers et quittances" },
    ],
  },
  {
    titre: "Comptabilité",
    liens: [
      { href: "/depenses", libelle: "Dépenses" },
      { href: "/emprunts", libelle: "Emprunts" },
      { href: "/synthese", libelle: "Synthèse annuelle" },
    ],
  },
  { titre: null, liens: [{ href: "/parametres", libelle: "Paramètres" }] },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 px-3 py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-cyan text-lg font-black text-navy-950">⏻</span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-wide text-white">OMNIUP</span>
        <span className="block text-xs uppercase tracking-widest text-brand-cyan">Location</span>
      </span>
    </Link>
  );
}

function Menu() {
  return (
    <nav className="space-y-5">
      {GROUPES.map((g, i) => (
        <div key={i}>
          {g.titre && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-navy-300">{g.titre}</p>}
          <ul className="space-y-0.5">
            {g.liens.map((l) => (
              <li key={l.href}>
                <NavLink href={l.href}>{l.libelle}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 px-3 py-4 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Logo />
        <div className="mt-6 flex-1 overflow-y-auto">
          <Menu />
        </div>
        <p className="px-3 text-[11px] text-navy-300">Gestion locative · v0.1</p>
      </aside>
      <details className="bg-navy-900 px-3 py-2 lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between">
          <Logo />
          <span className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white">Menu</span>
        </summary>
        <div className="pb-3 pt-2">
          <Menu />
        </div>
      </details>
    </>
  );
}
