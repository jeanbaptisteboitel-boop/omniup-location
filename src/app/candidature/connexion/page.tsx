import { redirect } from "next/navigation";
import type { SearchParams } from "@/lib/params";
import { dossierConnecte } from "@/lib/candidat";
import { Flash } from "@/components/flash";
import { Logomark } from "@/components/logomark";

export const metadata = { title: "Espace candidat" };
export const dynamic = "force-dynamic";

export default async function CandidatureConnexionPage({ searchParams }: { searchParams: SearchParams }) {
  if (await dossierConnecte()) redirect("/candidature");
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
            <div className="mt-1 text-[13px] text-slate-600">Espace candidat</div>
          </div>
        </div>
        <Flash sp={sp} />
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <h1 className="text-lg font-bold text-navy-900">Accéder à mon dossier</h1>
          <p className="mt-2 text-sm text-slate-600">
            Le bailleur vous a transmis un lien d&apos;accès personnel par email : ouvrez-le pour renseigner vos informations, déposer vos justificatifs et remettre votre dossier de candidature.
          </p>
          <p className="mt-3 text-sm text-slate-600">Si vous ne retrouvez plus ce lien, demandez-en un nouveau au bailleur ou à son gestionnaire.</p>
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} OMNIUP SAS · 224 av. des Alliés, 76140 Le Petit-Quevilly</p>
      </div>
    </div>
  );
}
