import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { definirMotDePasse } from "@/actions/session";
import { DefinirMotDePasseForm } from "@/components/connexion-form";
import { Logomark } from "@/components/logomark";

export const metadata = { title: "Choisir un mot de passe" };
export const dynamic = "force-dynamic";

export default async function DefinirMotDePassePage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const u = /^[a-f0-9]{64}$/.test(jeton) ? await prisma.utilisateur.findUnique({ where: { jetonInvitation: jeton }, select: { nom: true, email: true, actif: true, jetonExpireLe: true } }) : null;
  const valide = !!u && u.actif && !!u.jetonExpireLe && u.jetonExpireLe.getTime() > Date.now();
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-[420px]">
        <div className="mb-7 flex flex-col items-center gap-3">
          <Logomark taille={56} />
          <div className="text-center">
            <div className="text-[22px] font-extrabold tracking-[-0.02em] text-navy-900">
              OMNIUP <span className="text-brand-cyan">Location</span>
            </div>
            <div className="mt-1 text-[13px] text-slate-600">Gestion locative</div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <h1 className="mb-2 text-lg font-bold text-navy-900">Choisir un mot de passe</h1>
          {valide ? (
            <>
              <p className="mb-4 text-sm text-slate-600">Compte de <strong>{u!.nom}</strong> ({u!.email}).</p>
              <DefinirMotDePasseForm action={definirMotDePasse} jeton={jeton} />
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600">Ce lien n'est plus valable : demandez un nouveau lien depuis « Mot de passe oublié », ou une nouvelle invitation à un administrateur.</p>
              <p className="mt-4 text-sm"><Link href="/connexion" className="font-semibold text-navy-800 hover:underline">Retour à la connexion</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
