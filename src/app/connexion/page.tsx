import { redirect } from "next/navigation";
import { protectionActive } from "@/lib/session";
import { texteParam, type SearchParams } from "@/lib/params";
import { seConnecter } from "@/actions/session";
import { entiteCourante } from "@/lib/entite";
import { ConnexionForm } from "@/components/connexion-form";
import { Logomark } from "@/components/logomark";

export const metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function ConnexionPage({ searchParams }: { searchParams: SearchParams }) {
  if (!protectionActive()) redirect("/");
  const sp = await searchParams;
  let sousTitre = "Gestion locative";
  try {
    const entite = await entiteCourante();
    sousTitre = `Gestion locative · ${entite.nom}`;
  } catch {
    /* base indisponible : on garde le libellé générique */
  }
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[400px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <Logomark taille={56} />
          <div className="text-center">
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
            </div>
            <div className="mt-1 text-[13px] text-slate-600">{sousTitre}</div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <ConnexionForm action={seConnecter} suite={texteParam(sp, "suite") ?? "/"} />
        </div>
        <p className="mt-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} OMNIUP SAS · 224 av. des Alliés, 76140 Le Petit-Quevilly</p>
      </div>
    </div>
  );
}
