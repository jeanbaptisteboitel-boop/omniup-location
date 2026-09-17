"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({ href, icone, children }: { href: string; icone?: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const actif = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={actif ? "page" : undefined}
      className={
        "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors " +
        (actif ? "bg-navy-800 text-white shadow-[inset_3px_0_0_#17b8de]" : "text-navy-200 hover:bg-white/8 hover:text-white")
      }
    >
      {icone && <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center">{icone}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
}
