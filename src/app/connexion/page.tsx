import Link from "next/link";
import { redirect } from "next/navigation";
import { motDePassePrincipalDefini, protectionActive } from "@/lib/session";
import { aucunUtilisateur } from "@/lib/utilisateurs";
import { turnstileSiteKey } from "@/lib/turnstile";
import { mailConfigure } from "@/lib/mail";
import { texteParam, type SearchParams } from "@/lib/params";
import { creerPremierAdministrateur, demanderReinitialisation, seConnecter } from "@/actions/session";
import { ConnexionForm, ConnexionPrincipaleForm, OubliForm, PremierAdminForm } from "@/components/connexion-form";
import { Flash } from "@/components/flash";
import { Logomark } from "@/components/logomark";

export const metadata = { title: "Connexion" };
export const dynamic = "force-dynamic";

export default async function ConnexionPage({ searchParams }: { searchParams: SearchParams }) {
  if (!protectionActive()) redirect("/");
  const sp = await searchParams;
  const suite = texteParam(sp, "suite") ?? "/";
  const mode = texteParam(sp, "mode");
  const premier = await aucunUtilisateur().catch(() => false);
  const principal = motDePassePrincipalDefini();
  const siteKey = turnstileSiteKey();
  const principalDemande = mode === "principal" && principal;
  const titre = principalDemande ? "Mot de passe principal" : premier ? "Créer le compte administrateur" : mode === "oubli" ? "Mot de passe oublié" : "Connexion";
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
        <Flash sp={sp} />
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-card">
          <h1 className="mb-4 text-lg font-bold text-navy-900">{titre}</h1>
          {principalDemande ? (
            <ConnexionPrincipaleForm action={seConnecter} suite={suite} siteKey={siteKey} />
          ) : premier ? (
            <>
              <p className="mb-4 text-sm text-slate-600">Aucun compte n'existe encore. Ce premier compte sera super-administrateur : il accède à toutes les entités et crée les autres utilisateurs.</p>
              <PremierAdminForm action={creerPremierAdministrateur} motDePassePrincipalRequis={principal} siteKey={siteKey} />
            </>
          ) : mode === "oubli" ? (
            <>
              {mailConfigure() ? <p className="mb-4 text-sm text-slate-600">Indiquez l'email de votre compte : un lien pour choisir un nouveau mot de passe vous sera envoyé.</p> : <p className="mb-4 text-sm text-amber-700">L'envoi d'emails n'est pas configuré : demandez à un administrateur de vous renvoyer une invitation.</p>}
              <OubliForm action={demanderReinitialisation} siteKey={siteKey} />
            </>
          ) : (
            <ConnexionForm action={seConnecter} suite={suite} siteKey={siteKey} />
          )}
        </div>
        {(!premier || principal) && (
          <p className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-center text-xs text-slate-500">
            {mode ? (
              <Link href={`/connexion${suite !== "/" ? `?suite=${encodeURIComponent(suite)}` : ""}`} className="text-navy-800 hover:underline">{premier ? "Créer le compte administrateur" : "Connexion par email"}</Link>
            ) : !premier ? (
              <Link href="/connexion?mode=oubli" className="text-navy-800 hover:underline">Mot de passe oublié ?</Link>
            ) : null}
            {principal && mode !== "principal" && (
              <Link href={`/connexion?mode=principal${suite !== "/" ? `&suite=${encodeURIComponent(suite)}` : ""}`} className="text-navy-800 hover:underline">Mot de passe principal</Link>
            )}
          </p>
        )}
        <p className="mt-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} OMNIUP SAS · 224 av. des Alliés, 76140 Le Petit-Quevilly</p>
      </div>
    </div>
  );
}
