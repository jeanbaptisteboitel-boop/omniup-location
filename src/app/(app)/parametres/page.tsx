import { mailConfigure, expediteur, fournisseurMail } from "@/lib/mail";
import { iaConfiguree, modeleIA } from "@/lib/ia-config";
import { mistralConfigure, modeleMistralExtraction, modeleMistralOCR } from "@/lib/mistral-config";
import { stockageObjetConfigure } from "@/lib/storage";
import * as s3 from "@/lib/stockage-s3";
import * as local from "@/lib/stockage-local";
import { protectionActive } from "@/lib/session";
import { joursAvanceAvis } from "@/lib/loyers-sync";
import { entiteCourante, multiEntitesActif } from "@/lib/entite";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_ENTITE } from "@/lib/libelles";
import { envoyerEmailTest } from "@/actions/parametres";
import { activerMultiEntites, desactiverMultiEntites, modifierEntite } from "@/actions/entites";
import { Alerte, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { IconeBailleur, IconeEntites, IconeEnvoyer, IconeEtincelle, IconeHorloge, IconeOcr, IconeSignature, IconeStockage } from "@/components/icones";
import { CarteService } from "@/components/parametres/carte-service";
import { EmailTest } from "@/components/parametres/email-test";
import { EntiteForm } from "@/components/entites/entite-form";
import { Flash } from "@/components/flash";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

/** Hôte de la base de données, sans identifiants. */
function hoteBase(url: string): string {
  try {
    return new URL(url).host || "hôte inconnu";
  } catch {
    return url.replace(/\/\/.*@/, "//…@").slice(0, 60);
  }
}

export default async function ParametresPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [entite, multi, nbEntites] = await Promise.all([entiteCourante(), multiEntitesActif(), prisma.entite.count()]);
  const mail = mailConfigure();
  const fournisseur = fournisseurMail();
  const libelleFournisseur = fournisseur === "resend" ? "Resend" : fournisseur === "smtp" ? "SMTP" : null;
  const ia = iaConfiguree();
  const ocr = mistralConfigure();
  const objet = stockageObjetConfigure();
  const stockageOk = objet || !process.env.VERCEL;
  const cronSecret = !!process.env.CRON_SECRET;
  const envoiAuto = String(process.env.AVIS_ENVOI_AUTO ?? "").toLowerCase() === "true";
  const services: boolean[] = [true, multi, stockageOk, mail, cronSecret, ia, ocr, false];
  const nbOk = services.filter(Boolean).length;
  return (
    <>
      <PageHeader titre="Paramètres" sousTitre={`${nbOk} services configurés sur ${services.length} · ${services.length - nbOk} à configurer`} />
      <Flash sp={sp} />
      <div className="space-y-6">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          <CarteService
            icone={<IconeBailleur />}
            nom="Entité"
            configure
            detail={`${entite.nom} · ${TYPES_ENTITE[entite.type]}${multi ? " · entité de travail" : ""}`}
            action={<ButtonLink href="#entite" variante="secondary" taille="sm">Modifier</ButtonLink>}
          />
          <CarteService
            icone={<IconeEntites />}
            nom="Multi-entités"
            configure={multi}
            detail={multi ? `Activé · ${nbEntites} ${nbEntites > 1 ? "entités gérées" : "entité gérée"} · le sélecteur d'entité apparaît dans la barre latérale.` : "Désactivé · une seule entité gérée. Activez-le pour gérer plusieurs personnes ou sociétés (SCI, indivision, clients d'un cabinet) depuis le même compte."}
            action={
              multi ? (
                <>
                  <ButtonLink href="/entites" variante="secondary" taille="sm">Gérer les entités</ButtonLink>
                  <form action={desactiverMultiEntites}>
                    <Button type="submit" variante="ghost" taille="sm">Revenir en entité unique</Button>
                  </form>
                </>
              ) : (
                <form action={activerMultiEntites}>
                  <Button type="submit" taille="sm">Activer le multi-entités</Button>
                </form>
              )
            }
          />
          <CarteService
            icone={<IconeStockage />}
            nom="Stockage des fichiers"
            configure={stockageOk}
            detail={objet ? `Scaleway Object Storage · ${s3.region()} · ${s3.bucket()} · envoi direct depuis le navigateur (le bucket doit autoriser l'origine de l'application).` : `Disque local · ${local.racine()}${process.env.VERCEL ? " · à remplacer par un stockage objet sur Vercel." : ""}`}
            variables="SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET, SCW_REGION"
          />
          <CarteService
            icone={<IconeEnvoyer />}
            nom="Envoi d'emails"
            configure={mail}
            detail={
              fournisseur === "resend"
                ? `Resend · expéditeur ${expediteur() || "à renseigner (MAIL_FROM)"}`
                : fournisseur === "smtp"
                  ? `SMTP · ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || "587"} · expéditeur ${expediteur()}`
                  : "Aucun fournisseur · avis d'échéance, quittances et courriers ne peuvent pas être envoyés."
            }
            variables="RESEND_API_KEY, MAIL_FROM (ou SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)"
          />
          <CarteService
            icone={<IconeHorloge />}
            nom="Appels de loyer automatiques"
            configure={cronSecret}
            detail={`Avis émis ${joursAvanceAvis()} jours avant le début du mois · envoi par email ${envoiAuto ? "automatique" : "manuel"} · point d'entrée planifié /api/cron/loyers${cronSecret ? " protégé par un secret" : " sans secret"}.`}
            variables="AVIS_JOURS_AVANCE, AVIS_ENVOI_AUTO, CRON_SECRET"
          />
          <CarteService icone={<IconeEtincelle />} nom="Assistant IA" configure={ia} detail={`Anthropic · ${modeleIA()} · ${ia ? "clé API renseignée" : "clé API absente"}`} variables="ANTHROPIC_API_KEY, ANTHROPIC_MODEL" />
          <CarteService
            icone={<IconeOcr />}
            nom="OCR"
            configure={ocr}
            detail={`Mistral · ${modeleMistralOCR()} · lecture des échéanciers d'emprunt (extraction ${modeleMistralExtraction()})`}
            variables="MISTRAL_API_KEY, MISTRAL_MODEL_OCR, MISTRAL_MODEL_EXTRACTION"
          />
          <CarteService
            icone={<IconeSignature />}
            nom="Omniup Sign"
            configure={false}
            detail="Signature électronique des baux · intégration à venir. En attendant, téléchargez le PDF du contrat depuis la fiche du bail, faites-le signer, puis « Marquer comme signé »."
            variables="OMNIUP_SIGN_URL, OMNIUP_SIGN_API_KEY"
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-6 lg:items-start">
          <Card>
            <CardHeader titre="Email de test" description={mail ? `Vérifie la configuration ${libelleFournisseur} et l'expéditeur ${expediteur() || "(MAIL_FROM manquant)"}.` : "L'envoi d'emails n'est pas configuré."} />
            {mail ? (
              <>
                {!expediteur() && (
                  <div className="px-5 pt-4">
                    <Alerte ton="orange">Aucune adresse d'expédition : renseignez MAIL_FROM.</Alerte>
                  </div>
                )}
                <EmailTest action={envoyerEmailTest} />
              </>
            ) : (
              <CardBody>
                <Alerte ton="orange">Renseignez RESEND_API_KEY et MAIL_FROM (adresse sur un domaine vérifié chez Resend), ou les variables SMTP_*, dans le fichier .env du serveur.</Alerte>
              </CardBody>
            )}
          </Card>
          <Card>
            <CardHeader titre="Sécurité et données" />
            <dl className="grid gap-3 px-5 py-4 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Mot de passe d'accès</dt>
                <dd className={`text-right font-semibold ${protectionActive() ? "text-navy-900" : "text-amber-700"}`}>{protectionActive() ? "Défini" : "Non défini · à définir avant toute exposition sur Internet (APP_PASSWORD)"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Base de données</dt>
                <dd className="text-right font-semibold text-navy-900">{process.env.DATABASE_URL ? `PostgreSQL · ${hoteBase(process.env.DATABASE_URL)}` : "Non configurée (DATABASE_URL)"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-600">Version</dt>
                <dd className="text-right font-semibold text-navy-900">OMNIUP Location v0.3</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div id="entite" className="scroll-mt-6">
          <Card className="max-w-3xl">
            <CardHeader titre={multi ? `Entité de travail : ${entite.nom}` : "Entité"} description={multi ? "Nom et nature de l'entité actuellement sélectionnée." : "Nom et nature de l'entité gérée (personne ou société), repris dans l'assistant et les documents."} />
            <CardBody>
              <EntiteForm action={modifierEntite.bind(null, entite.id)} initial={entite} retour="/parametres" />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
