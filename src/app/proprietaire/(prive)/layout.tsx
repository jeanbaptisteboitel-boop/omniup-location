import Link from "next/link";
import type { ReactNode } from "react";
import { exigerBailleur } from "@/lib/proprietaire";
import { seDeconnecterProprietaire } from "@/actions/proprietaire";
import { Button } from "@/components/ui";
import { Logomark } from "@/components/logomark";
import { NavProprietaire } from "@/components/proprietaire/nav";

export const dynamic = "force-dynamic";

/** Espace propriétaire : en-tête simple (sans la navigation du gestionnaire), accès réservé au bailleur identifié par son lien. */
export default async function ProprietaireLayout({ children }: { children: ReactNode }) {
  const b = await exigerBailleur();
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/proprietaire" className="order-1 flex min-w-0 items-center gap-2.5">
            <Logomark taille={32} />
            <span className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
              <span className="ml-2 hidden text-[13px] font-medium text-slate-500 sm:inline">Espace propriétaire</span>
            </span>
          </Link>
          <NavProprietaire className="order-3 basis-full sm:order-2 sm:basis-auto" />
          <div className="order-2 ml-auto flex shrink-0 items-center gap-3 sm:order-3">
            <span className="hidden max-w-[260px] truncate text-sm text-slate-600 md:inline">{b.nom}</span>
            <form action={seDeconnecterProprietaire}>
              <Button type="submit" variante="ghost" taille="sm">Se déconnecter</Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 pb-12 pt-6 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-[1100px] px-4 pb-8 text-center text-xs text-slate-500 sm:px-6">Espace mis à votre disposition par votre gestionnaire. Pour toute question sur vos biens ou vos locataires, contactez-le directement.</footer>
    </div>
  );
}
