import { redirect } from "next/navigation";
import type { SearchParams } from "@/lib/params";
import { bailleurConnecte } from "@/lib/proprietaire";
import { mailConfigure } from "@/lib/mail";
import { turnstileSiteKey } from "@/lib/turnstile";
import { demanderLienAccesProprietaire } from "@/actions/proprietaire";
import { Flash } from "@/components/flash";
import { Logomark } from "@/components/logomark";
import { LienForm } from "@/components/proprietaire/lien-form";

export const metadata = { title: "Espace propriétaire" };
export const dynamic = "force-dynamic";

export default async function ProprietaireConnexionPage({ searchParams }: { searchParams: SearchParams }) {
  if (await bailleurConnecte()) redirect("/proprietaire");
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[460px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <Logomark taille={56} />
          <div className="text-center">
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
            </div>
            <div className="mt-1 text-[13px] text-slate-600">Espace propriétaire</div>
          </div>
        </div>
        <Flash sp={sp} />
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <h1 className="text-lg font-bold text-navy-900">Accéder à mon espace</h1>
          <p className="mt-2 text-sm text-slate-600">Votre gestionnaire vous a transmis un lien d'accès personnel : ouvrez-le pour entrer dans votre espace. Vous y suivez vos biens, les baux, les loyers encaissés et en retard, les dépenses et la synthèse annuelle.</p>
          <div className="mt-5 border-t border-slate-100 pt-5">
            <h2 className="text-sm font-bold text-navy-900">Lien perdu ?</h2>
            <LienForm action={demanderLienAccesProprietaire} mailConfigure={mailConfigure()} siteKey={turnstileSiteKey()} />
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} OMNIUP SAS · 224 av. des Alliés, 76140 Le Petit-Quevilly</p>
      </div>
    </div>
  );
}
