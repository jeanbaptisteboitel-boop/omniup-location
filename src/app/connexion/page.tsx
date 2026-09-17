import { redirect } from "next/navigation";
import { protectionActive } from "@/lib/session";
import { texteParam, type SearchParams } from "@/lib/params";
import { seConnecter } from "@/actions/session";
import { ConnexionForm } from "@/components/connexion-form";

export const metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function ConnexionPage({ searchParams }: { searchParams: SearchParams }) {
  if (!protectionActive()) redirect("/");
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-sm py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-navy-900">Accès à OMNIUP Location</h1>
        <p className="mt-1 text-sm text-slate-500">Saisissez le mot de passe de l'application.</p>
        <div className="mt-5">
          <ConnexionForm action={seConnecter} suite={texteParam(sp, "suite") ?? "/"} />
        </div>
      </div>
    </div>
  );
}
