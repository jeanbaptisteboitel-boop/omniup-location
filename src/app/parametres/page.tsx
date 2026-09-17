import path from "node:path";
import { mailConfigure, expediteur } from "@/lib/mail";
import { iaConfiguree, modeleIA } from "@/lib/ia-config";
import { joursAvanceAvis } from "@/lib/loyers-sync";
import { envoyerEmailTest } from "@/actions/parametres";
import { Badge, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { EmailTest } from "@/components/parametres/email-test";

export const metadata = { title: "Paramètres" };
export const dynamic = "force-dynamic";

function Etat({ ok, oui = "Configuré", non = "Non configuré" }: { ok: boolean; oui?: string; non?: string }) {
  return <Badge ton={ok ? "vert" : "orange"}>{ok ? oui : non}</Badge>;
}

export default function ParametresPage() {
  const smtp = mailConfigure();
  const ia = iaConfiguree();
  const cronSecret = !!process.env.CRON_SECRET;
  const envoiAuto = String(process.env.AVIS_ENVOI_AUTO ?? "").toLowerCase() === "true";
  return (
    <>
      <PageHeader titre="Paramètres" sousTitre="La configuration se fait dans le fichier .env à la racine de l'application (redémarrez l'application après modification)." />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Stockage" />
          <CardBody>
            <Infos items={[
              { label: "Base de données", valeur: process.env.DATABASE_URL ?? "file:./dev.db (dossier prisma/)" },
              { label: "Fichiers importés", valeur: path.resolve(process.env.STORAGE_DIR || "storage") },
            ]} />
            <p className="mt-3 text-xs text-slate-500">Sauvegardez régulièrement le fichier de base de données et le dossier des fichiers importés.</p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre="Envoi d'emails (SMTP)" actions={<Etat ok={smtp} />} />
          <CardBody className="space-y-4">
            <Infos items={[
              { label: "Serveur", valeur: process.env.SMTP_HOST || "—" },
              { label: "Port", valeur: process.env.SMTP_PORT || "587" },
              { label: "Expéditeur", valeur: expediteur() || "—" },
              { label: "Identifiant", valeur: process.env.SMTP_USER || "—" },
            ]} />
            <p className="text-sm text-slate-600">Variables : SMTP_HOST, SMTP_PORT, SMTP_SECURE (true pour le port 465), SMTP_USER, SMTP_PASS, SMTP_FROM. Les réponses des locataires sont adressées à l'email du bailleur du lot.</p>
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
            <p className="mt-3 text-sm text-slate-600">L'assistant rédige les contrats de bail, les courriers (révision de loyer, relance) et les emails d'accompagnement, et lit les tableaux d'amortissement en PDF. Chaque texte généré doit être relu avant envoi.</p>
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
