import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { nomComplet } from "@/lib/libelles";
import { iaConfiguree } from "@/lib/ia-config";
import { mailConfigure } from "@/lib/mail";
import { emailContrat } from "@/lib/mail-modeles";
import { initialiserModelesDefaut } from "@/lib/modeles-data";
import { enregistrerContrat, envoyerContrat } from "@/actions/baux";
import { genererContrat, genererEmail } from "@/actions/ia";
import { genererContratDepuisModele } from "@/actions/modeles";
import { Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { Field, Select } from "@/components/form";
import { Flash } from "@/components/flash";
import { EnvoiEmail } from "@/components/envoi-email";
import { ContratEditeur } from "@/components/baux/contrat-editeur";
import { STATUTS_BAIL_COURT } from "@/components/baux/badge-statut";
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
  const modeleParDefaut = modelesBaux.find((m) => (b.type === "MEUBLE" && m.nom.toLowerCase().includes("meublé")) || (b.type === "MOBILITE" && m.nom.toLowerCase().includes("mobilité")) || (b.type === "NON_MEUBLE" && m.nom.toLowerCase().includes("logement vide")));
  const pdfHref = `/api/baux/${b.id}/contrat.pdf`;
  return (
    <>
      <PageHeader
        titre="Contrat de bail"
        sousTitre={`${b.lot.nom} · ${nomComplet(b.locataire)} · ${STATUTS_BAIL_COURT[b.statut]}. Rédigez ou générez le texte, enregistrez-le, puis téléchargez le PDF à faire signer dans Omniup Sign.`}
        retour={{ href: `/baux/${b.id}`, libelle: "Bail" }}
        actions={b.texteContrat ? <ButtonLink href={pdfHref} variante="secondary" target="_blank">Télécharger le PDF</ButtonLink> : undefined}
      />
      <Flash sp={sp} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader titre="Générer depuis un modèle" description="Remplit le texte du contrat avec le modèle choisi et les données du bail (le texte actuel est remplacé)." />
          <CardBody>
            <form action={genererContratDepuisModele.bind(null, b.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field label="Modèle de bail" name="modeleId" className="min-w-0 flex-1">
                <Select name="modeleId" options={modelesBaux.map((m) => ({ value: String(m.id), label: m.nom }))} defaultValue={modeleParDefaut ? String(modeleParDefaut.id) : undefined} />
              </Field>
              <Button type="submit" variante="secondary" className="shrink-0">Générer depuis ce modèle</Button>
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre="Texte du contrat" description="Rédigez-le, collez-le, ou générez-le ci-dessus. Titres : lignes « # » ou « ## » ; listes : lignes « - »." />
          <CardBody>
            <ContratEditeur
              actionEnregistrer={enregistrerContrat.bind(null, b.id)}
              actionGenerer={genererContrat.bind(null, b.id)}
              texteInitial={b.texteContrat ?? ""}
              pdfHref={pdfHref}
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
