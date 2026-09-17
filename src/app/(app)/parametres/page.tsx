import { mailConfigure, expediteur, fournisseurMail } from "@/lib/mail";
import { iaConfiguree, modeleIA } from "@/lib/ia-config";
import { mistralConfigure, modeleMistralExtraction, modeleMistralOCR } from "@/lib/mistral-config";
import { descriptionStockage, stockageObjetConfigure } from "@/lib/storage";
import { protectionActive } from "@/lib/session";
import { joursAvanceAvis } from "@/lib/loyers-sync";
import { envoyerEmailTest } from "@/actions/parametres";
import { Alerte, Badge, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { EmailTest } from "@/components/parametres/email-test";
import { EntiteForm } from "@/components/entites/entite-form";
import { entiteCourante, multiEntitesActif } from "@/lib/entite";
import { activerMultiEntites, desactiverMultiEntites, modifierEntite } from "@/actions/entites";
import { prisma } from "@/lib/prisma";
import { Button, ButtonLink } from "@/components/ui";
import { Flash } from "@/components/flash";
import type { SearchParams } from "@/lib/params";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

function Etat({ ok, oui = "Configuré", non = "Non configuré" }: { ok: boolean; oui?: string; non?: string }) {
  return <Badge ton={ok ? "vert" : "orange"}>{ok ? oui : non}</Badge>;
}

export default async function ParametresPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [entite, multi, nbEntites] = await Promise.all([entiteCourante(), multiEntitesActif(), prisma.entite.count()]);
  const smtp = mailConfigure();
  const fournisseur = fournisseurMail();
  const ia = iaConfiguree();
  const cronSecret = !!process.env.CRON_SECRET;
  const envoiAuto = String(process.env.AVIS_ENVOI_AUTO ?? "").toLowerCase() === "true";
  return (
    <>
      <PageHeader titre="Paramètres" sousTitre="Réglages de l'application ; la configuration technique se fait dans les variables d'environnement (fichier .env ou Vercel)." />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre={multi ? `Entité de travail : ${entite.nom}` : "Entité"} description={multi ? "Nom et nature de l'entité actuellement sélectionnée." : "Nom et nature de l'entité gérée (personne ou société), repris dans l'assistant et les documents."} />
          <CardBody>
            <EntiteForm action={modifierEntite.bind(null, entite.id)} initial={entite} retour="/parametres" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Gestion multi-entités" actions={<Etat ok={multi} oui="Activée" non="Entité unique" />} />
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">
              Pour une entreprise de gérance locative ou un cabinet gérant plusieurs personnes et sociétés : chaque entité dispose de ses propres bailleurs, immeubles, lots, locataires, baux, dépenses et emprunts, et l'entité de travail se choisit dans la barre latérale. Les modèles de documents restent communs.
            </p>
            {multi ? (
              <div className="flex flex-wrap gap-2">
                <ButtonLink href="/entites" variante="secondary">Gérer les entités ({nbEntites})</ButtonLink>
                <form action={desactiverMultiEntites}><Button type="submit" variante="ghost">Revenir en entité unique</Button></form>
              </div>
            ) : (
              <form action={activerMultiEntites}><Button type="submit" variante="accent">Activer la gestion de plusieurs entités</Button></form>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Stockage" />
          <CardBody>
            <Infos items={[
              { label: "Base de données", valeur: process.env.DATABASE_URL ? `PostgreSQL — ${process.env.DATABASE_URL.replace(/\/\/.*@/, "//…@")}` : "Non configurée (DATABASE_URL)" },
              { label: "Fichiers importés", valeur: <span>{descriptionStockage()} <Etat ok={stockageObjetConfigure() || !process.env.VERCEL} oui={stockageObjetConfigure() ? "Stockage objet" : "Disque local"} non="À configurer sur Vercel (SCW_*)" /></span> },
              { label: "Accès", valeur: <Etat ok={protectionActive()} oui="Protégé par mot de passe (APP_PASSWORD)" non="Aucun mot de passe : à définir avant toute exposition sur Internet" /> },
            ]} />
            <p className="mt-3 text-xs text-slate-500">Les fichiers envoyés depuis le navigateur vont directement au stockage objet (URL signée) : le bucket doit autoriser l'origine de l'application (script scripts/configurer-cors.mjs).</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Envoi d'emails" description="Avis d'échéance, quittances, contrats et courriers sont envoyés par Resend (recommandé) ou, à défaut, par un serveur SMTP." actions={<Etat ok={smtp} oui={fournisseur === "resend" ? "Resend" : "SMTP"} />} />
          <CardBody className="space-y-4">
            {fournisseur === "smtp" ? (
              <Infos items={[
                { label: "Fournisseur", valeur: "SMTP" },
                { label: "Expéditeur", valeur: expediteur() || "—" },
                { label: "Serveur", valeur: `${process.env.SMTP_HOST} : ${process.env.SMTP_PORT || "587"}` },
                { label: "Identifiant", valeur: process.env.SMTP_USER || "—" },
              ]} />
            ) : (
              <Infos items={[
                { label: "Fournisseur", valeur: fournisseur === "resend" ? "Resend" : "—" },
                { label: "Expéditeur", valeur: expediteur() || "—" },
              ]} />
            )}
            <p className="text-sm text-slate-600">Resend : RESEND_API_KEY et MAIL_FROM (adresse sur un domaine vérifié chez Resend). SMTP : SMTP_HOST, SMTP_PORT, SMTP_SECURE (true pour le port 465), SMTP_USER, SMTP_PASS et MAIL_FROM. Les réponses des locataires sont adressées à l'email du bailleur du lot.</p>
            {smtp && !expediteur() && <Alerte ton="orange">Aucune adresse d'expédition : renseignez MAIL_FROM.</Alerte>}
            {smtp && <EmailTest action={envoyerEmailTest} />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Appels de loyer automatiques" />
          <CardBody className="space-y-3">
            <Infos items={[
              { label: "Émission des avis", valeur: `${joursAvanceAvis()} jours avant le début du mois (AVIS_JOURS_AVANCE)` },
              { label: "Envoi automatique par email", valeur: <Etat ok={envoiAuto} oui="Activé (AVIS_ENVOI_AUTO=true)" non="Désactivé (AVIS_ENVOI_AUTO=false)" /> },
              { label: "Point d'entrée planifié", valeur: <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">/api/cron/loyers{cronSecret ? "?secret=…" : ""}</code> },
              { label: "Secret du point d'entrée", valeur: <Etat ok={cronSecret} oui="Défini (CRON_SECRET)" non="Non défini : l'URL est accessible sans secret" /> },
            ]} />
            <p className="text-sm text-slate-600">
              Les appels sont générés à chaque ouverture du tableau de bord ou de la page Loyers. Pour une émission (et un envoi) sans intervention, appelez chaque jour l'URL ci-dessus depuis une tâche planifiée (Windows), un cron (Linux/macOS) ou un scénario Make.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Assistant IA (Anthropic)" actions={<Etat ok={ia} />} />
          <CardBody>
            <Infos items={[
              { label: "Modèle", valeur: modeleIA() },
              { label: "Clé API", valeur: ia ? "Renseignée (ANTHROPIC_API_KEY)" : "Absente : renseignez ANTHROPIC_API_KEY" },
            ]} />
            <p className="mt-3 text-sm text-slate-600">L'assistant rédige les contrats de bail, les courriers (révision de loyer, relance) et les emails d'accompagnement. Chaque texte généré doit être relu avant envoi.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="OCR et extraction (Mistral)" actions={<Etat ok={mistralConfigure()} />} />
          <CardBody>
            <Infos items={[
              { label: "Modèle OCR", valeur: modeleMistralOCR() },
              { label: "Modèle d'extraction", valeur: modeleMistralExtraction() },
              { label: "Clé API", valeur: mistralConfigure() ? "Renseignée (MISTRAL_API_KEY)" : "Absente : renseignez MISTRAL_API_KEY" },
            ]} />
            <p className="mt-3 text-sm text-slate-600">Lecture des tableaux d'amortissement fournis en PDF ou en photo : le document est passé à l'OCR puis chaque échéance est extraite en données structurées, à vérifier avant import.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Omniup Sign (signature électronique)" actions={<Badge ton="gris">Intégration à venir</Badge>} />
          <CardBody>
            <p className="text-sm text-slate-600">
              Aujourd'hui : téléchargez le PDF du contrat depuis la fiche du bail, faites-le signer dans Omniup Sign, puis cliquez sur « Marquer comme signé » en indiquant la référence du dossier. L'envoi direct vers Omniup Sign et la réception automatique de la signature seront branchés sur les variables OMNIUP_SIGN_URL et OMNIUP_SIGN_API_KEY.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
