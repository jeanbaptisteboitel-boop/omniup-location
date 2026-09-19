"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/proprietaire", libelle: "Accueil" },
  { href: "/proprietaire/synthese", libelle: "Synthèse" },
];

/** Navigation de l'espace propriétaire (Accueil, Synthèse) avec le lien courant mis en évidence. */
export function NavProprietaire({ className = "" }: { className?: string }) {
  const chemin = usePathname();
  return (
    <nav aria-label="Espace propriétaire" className={`flex items-center gap-1 ${className}`}>
      {LIENS.map((l) => {
        const actif = l.href === "/proprietaire" ? chemin === "/proprietaire" || chemin.startsWith("/proprietaire/lots") : chemin.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={actif ? "page" : undefined} className={`rounded-md px-2.5 py-1.5 text-sm font-semibold transition-colors ${actif ? "bg-navy-50 text-navy-900" : "text-slate-600 hover:bg-navy-50 hover:text-navy-900"}`}>
            {l.libelle}
          </Link>
        );
      })}
    </nav>
  );
}
