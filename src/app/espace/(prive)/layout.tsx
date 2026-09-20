import Link from "next/link";
import type { ReactNode } from "react";
import { exigerLocataire } from "@/lib/espace";
import { compterNonLuesLocataire } from "@/lib/maintenance";
import { nomComplet } from "@/lib/libelles";
import { seDeconnecterEspace } from "@/actions/espace";
import { Button } from "@/components/ui";
import { Logomark } from "@/components/logomark";
import { NavEspace } from "@/components/espace/nav-espace";

export const dynamic = "force-dynamic";

/** Espace locataire : en-tête simple (sans la navigation du gestionnaire), accès réservé au locataire identifié par son lien. */
export default async function EspaceLayout({ children }: { children: ReactNode }) {
  const l = await exigerLocataire();
  const nonLues = await compterNonLuesLocataire(l.id);
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/espace" className="flex min-w-0 items-center gap-2.5">
            <Logomark taille={32} />
            <span className="truncate text-[15px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
              <span className="ml-2 hidden text-[13px] font-medium text-slate-500 sm:inline">Espace locataire</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-sm text-slate-600 md:inline">{nomComplet(l)}</span>
            <form action={seDeconnecterEspace}>
              <Button type="submit" variante="ghost" taille="sm">Se déconnecter</Button>
            </form>
          </div>
        </div>
      </header>
      <NavEspace
        liens={[
          { href: "/espace", libelle: "Mon espace" },
          { href: "/espace/maintenance", libelle: "Mes demandes", pastille: nonLues },
        ]}
      />
      <main className="mx-auto max-w-[1000px] px-4 pb-12 pt-6 sm:px-6">{children}</main>
      <footer className="mx-auto max-w-[1000px] px-4 pb-8 text-center text-xs text-slate-500 sm:px-6">Espace mis à votre disposition par votre bailleur. Pour toute question sur votre location, contactez-le directement.</footer>
    </div>
  );
}
