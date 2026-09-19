import { Suspense } from "react";
import { Sidebar } from "@/components/sidebar";
import { FlashGlobal } from "@/components/flash-global";
import { exigerSession } from "@/lib/utilisateurs";
import { seDeconnecter } from "@/actions/session";
import { Button } from "@/components/ui";
import { Logomark } from "@/components/logomark";

// Zone connectée : jamais prérendue à la compilation (session, entité de travail et droits dépendent de la requête).
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await exigerSession();
  if (!session.superAdmin && session.acces.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-[460px] rounded-xl border border-slate-200 bg-white p-7 text-center shadow-card">
          <Logomark taille={48} className="mx-auto" />
          <h1 className="mt-4 text-lg font-bold text-navy-900">Aucune entité accessible</h1>
          <p className="mt-2 text-sm text-slate-600">Votre compte {session.email ? `(${session.email}) ` : ""}n'a accès à aucune entité pour l'instant : demandez à un administrateur de vous accorder un accès.</p>
          <form action={seDeconnecter} className="mt-5">
            <Button type="submit" variante="secondary">Se déconnecter</Button>
          </form>
        </div>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen flex-col lg:flex-row lg:items-stretch">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="mx-auto w-full max-w-[1200px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-8">
          <Suspense fallback={null}>
            <FlashGlobal />
          </Suspense>
          {children}
        </div>
      </main>
    </div>
  );
}
