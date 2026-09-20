import Link from "next/link";
import type { ReactNode } from "react";
import { exigerDossier } from "@/lib/candidat";
import { nomDossier } from "@/lib/candidatures";
import { seDeconnecterCandidat } from "@/actions/candidat";
import { Button } from "@/components/ui";
import { Logomark } from "@/components/logomark";
import { NavEspace } from "@/components/espace/nav-espace";

export const dynamic = "force-dynamic";

/** Espace candidat : le candidat, un colocataire ou une caution complète son propre dossier. */
export default async function CandidatureLayout({ children }: { children: ReactNode }) {
  const d = await exigerDossier();
  const caution = d.role === "GARANT";
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/candidature" className="flex min-w-0 items-center gap-2.5">
            <Logomark taille={32} />
            <span className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
              <span className="ml-2 hidden text-[13px] font-medium text-slate-500 sm:inline">{caution ? "Espace caution" : "Espace candidat"}</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-slate-600 md:inline">{nomDossier(d)}</span>
            <form action={seDeconnecterCandidat}>
              <Button type="submit" variante="ghost" taille="sm">Se déconnecter</Button>
            </form>
          </div>
        </div>
      </header>
      <NavEspace
        liens={[
          { href: "/candidature", libelle: "Mon dossier" },
          { href: "/candidature/informations", libelle: "Mes informations" },
          { href: "/candidature/justificatifs", libelle: "Mes justificatifs" },
          ...(caution ? [] : [{ href: "/candidature/cautions", libelle: "Ma caution" }]),
        ]}
      />
      <main className="mx-auto max-w-[1000px] px-4 pb-12 pt-6 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-[1000px] px-4 pb-8 text-center text-xs text-slate-500 sm:px-6">
        Les pièces demandées sont limitées à celles qu&apos;autorise le décret du 5 novembre 2015. Vos documents ne sont accessibles qu&apos;au bailleur et à son gestionnaire.
      </footer>
    </div>
  );
}
