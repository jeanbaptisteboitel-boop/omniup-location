import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { iaConfiguree } from "@/lib/ia-config";
import { enregistrerContrat, envoyerContrat } from "@/actions/baux";
import { genererEmail } from "@/actions/ia";
import { genererContratDepuisModele } from "@/actions/modeles";
import { initialiserModelesDefaut } from "@/lib/modeles-data";
import { Button } from "@/components/ui";
import { Flash } from "@/components/flash";
import type { SearchParams } from "@/lib/params";
import { mailConfigure } from "@/lib/mail";
import { emailContrat } from "@/lib/mail-modeles";
import { EnvoiEmail } from "@/components/envoi-email";
import { genererContrat } from "@/actions/ia";
import { ContratEditeur } from "@/components/baux/contrat-editeur";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Contrat de bail" };

export default async function ContratPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  await initialiserModelesDefaut();
  const modelesBaux = await prisma.modeleDocument.findMany({ where: { categorie: "BAIL" }, orderBy: { nom: "asc" }, select: { id: true, nom: true } });
  const b = await prisma.bail.findFirst({ where: { id, entiteId: await entiteCouranteId() }, include: { lot: { include: { bailleur: true } }, locataire: true } });
  if (!b) notFound();
  const modele = emailContrat(b);
  return (
    <>
      <PageHeader
        titre={`Contrat — ${b.lot.nom}`}
        sousTitre={`${nomComplet(b.locataire)}. Rédigez ou générez le texte du contrat, enregistrez-le, puis téléchargez le PDF à faire signer dans Omniup Sign.`}
        retour={{ href: `/baux/${b.id}`, libelle: "Bail" }}
      />
      <Flash sp={sp} />
      <div className="space-y-6">
      <Card>
        <CardHeader titre="Générer le contrat depuis un modèle" description="Remplit le texte ci-dessous avec le modèle choisi et les données du bail (le texte actuel est remplacé)." />
        <CardBody>
          <form action={genererContratDepuisModele.bind(null, b.id)} className="flex flex-wrap items-end gap-3">
            <label className="block min-w-64 flex-1 text-sm">
              <span className="mb-1 block font-medium text-navy-900">Modèle de bail</span>
              <select name="modeleId" className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" defaultValue={modelesBaux.find((m) => (b.type === "MEUBLE" && m.nom.toLowerCase().includes("meublé")) || (b.type === "MOBILITE" && m.nom.toLowerCase().includes("mobilité")) || (b.type === "NON_MEUBLE" && m.nom.toLowerCase().includes("logement vide")))?.id}>
                {modelesBaux.map((m) => <option key={m.id} value={m.id}>{m.nom}</option>)}
              </select>
            </label>
            <Button type="submit" variante="secondary">Générer depuis ce modèle</Button>
          </form>
        </CardBody>
      </Card>
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

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
