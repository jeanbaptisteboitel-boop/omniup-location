"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui";

export type LienEspace = { href: string; libelle: string; pastille?: number };

/** Navigation de l'espace locataire (onglets soulignés sous l'en-tête). */
export function NavEspace({ liens }: { liens: LienEspace[] }) {
  const pathname = usePathname();
  return (
    <nav className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1000px] gap-1 overflow-x-auto px-4 sm:px-6">
        {liens.map((l) => {
          const actif = l.href === "/espace" ? pathname === "/espace" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={actif ? "page" : undefined}
              className={`flex h-11 shrink-0 items-center gap-2 whitespace-nowrap px-3.5 text-sm ${actif ? "font-bold text-navy-900 shadow-[inset_0_-2px_0_#172c52]" : "font-medium text-slate-500 hover:text-navy-900"}`}
            >
              {l.libelle}
              {!!l.pastille && <Badge ton="cyan">{l.pastille}</Badge>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
