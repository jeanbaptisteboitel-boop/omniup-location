"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { IconeMenu } from "./icones";

/** En-tête mobile (56 px) et tiroir de navigation ; le contenu du tiroir est la barre latérale rendue côté serveur. */
export function MobileNav({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOuvert(false), [pathname]);
  useEffect(() => {
    if (!ouvert) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [ouvert]);
  return (
    <div className="contents lg:hidden">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 bg-navy-900 px-3 text-white">
        <button type="button" onClick={() => setOuvert(true)} aria-label="Ouvrir le menu" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg hover:bg-white/8">
          <IconeMenu taille={22} />
        </button>
        <span className="text-[15px] font-extrabold">
          OMNIUP <span className="font-semibold text-brand-cyan">Location</span>
        </span>
      </header>
      {ouvert && (
        <>
          <div className="fixed inset-0 z-40 bg-[rgba(10,21,40,0.55)]" onClick={() => setOuvert(false)} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 z-50 animate-fadein overflow-y-auto shadow-tiroir">{children}</div>
        </>
      )}
    </div>
  );
}
