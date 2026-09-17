import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { iaConfiguree } from "@/lib/ia-config";
import { enregistrerContrat, envoyerContrat } from "@/actions/baux";
import { genererEmail } from "@/actions/ia";
import { mailConfigure } from "@/lib/mail";
import { emailContrat } from "@/lib/mail-modeles";
import { EnvoiEmail } from "@/components/envoi-email";
import { genererContrat } from "@/actions/ia";
import { ContratEditeur } from "@/components/baux/contrat-editeur";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";

export const metadata = { title: "Contrat de bail" };

export default async function ContratPage({ params }: { params: ParamsId }) {
  const id = await idDepuis(params);
  const b = await prisma.bail.findUnique({ where: { id }, include: { lot: { include: { bailleur: true } }, locataire: true } });
  if (!b) notFound();
  const modele = emailContrat(b);
  return (
    <>
      <PageHeader
        titre={`Contrat — ${b.lot.nom}`}
        sousTitre={`${nomComplet(b.locataire)}. Rédigez ou générez le texte du contrat, enregistrez-le, puis téléchargez le PDF à faire signer dans Omniup Sign.`}
        retour={{ href: `/baux/${b.id}`, libelle: "Bail" }}
      />
      <div className="space-y-6">
      <Card>
        <CardBody>
          <ContratEditeur
            actionEnregistrer={enregistrerContrat.bind(null, b.id)}
            actionGenerer={genererContrat.bind(null, b.id)}
            texteInitial={b.texteContrat ?? ""}
            pdfHref={`/api/baux/${b.id}/contrat.pdf`}
            iaConfiguree={iaConfiguree()}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader titre="Envoyer le projet de contrat par email" description="Le contrat enregistré est joint en PDF (relecture par le locataire avant la signature dans Omniup Sign)." />
        <CardBody>
          {b.texteContrat ? (
            <EnvoiEmail
              action={envoyerContrat.bind(null, b.id)}
              actionIA={genererEmail.bind(null, b.id)}
              destinataire={b.locataire.email}
              objetDefaut={modele.objet}
              corpsDefaut={modele.corps}
              contexteIA="Envoi du projet de contrat de location en PDF pour relecture avant signature électronique."
              libelleBouton="Envoyer le contrat par email"
              pieceJointe="le contrat"
              mailConfigure={mailConfigure()}
              iaConfiguree={iaConfiguree()}
            />
          ) : (
            <p className="text-sm text-slate-500">Enregistrez d'abord le texte du contrat.</p>
          )}
        </CardBody>
      </Card>
      </div>
    </>
  );
}
