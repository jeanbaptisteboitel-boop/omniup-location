import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE, TYPES_BAIL_COURT, nomComplet } from "@/lib/libelles";
import { formatDate, formatDateHeure } from "@/lib/dates";
import { entiteCouranteId } from "@/lib/entite";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { adapterDocumentIA, envoyerDocumentGenere, modifierDocumentGenere, supprimerDocumentGenere } from "@/actions/documents-generes";
import { genererEmail } from "@/actions/ia";
import { DocumentEditeur } from "@/components/modeles/document-editeur";
import { EnvoiEmail } from "@/components/envoi-email";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export const maxDuration = 300;

export default async function DocumentPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const entiteId = await entiteCouranteId();
  const [d, baux] = await Promise.all([
    prisma.documentGenere.findFirst({ where: { id, entiteId }, include: { bail: { include: { lot: { include: { bailleur: true } }, locataire: true } }, modele: { select: { id: true, nom: true } } } }),
    prisma.bail.findMany({ where: { entiteId }, include: { lot: true, locataire: true }, orderBy: [{ statut: "asc" }, { dateDebut: "desc" }] }),
  ]);
  if (!d) notFound();
  const bailleur = d.bail?.lot.bailleur;
  return (
    <>
      <PageHeader
        titre={d.titre}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            <Badge ton="bleu">{CATEGORIES_MODELE[d.categorie]}</Badge>
            {d.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDateHeure(d.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}
            <span>Créé le {formatDate(d.createdAt)}{d.modele && <> · modèle <Link href={`/modeles/${d.modele.id}`} className="text-navy-800 hover:underline">{d.modele.nom}</Link></>}{d.bail && <> · <Link href={`/baux/${d.bail.id}`} className="text-navy-800 hover:underline">{d.bail.lot.nom} — {nomComplet(d.bail.locataire)}</Link></>}</span>
          </span>
        }
        retour={{ href: d.bailId ? `/baux/${d.bailId}` : "/documents", libelle: d.bailId ? "Bail" : "Documents" }}
        actions={
          <>
            <ButtonLink href={`/api/documents-generes/${d.id}/document.pdf`} variante="secondary" target="_blank">Voir le PDF</ButtonLink>
            <ButtonLink href={`/api/documents-generes/${d.id}/document.pdf?dl=1`} variante="secondary">Télécharger</ButtonLink>
            <ConfirmForm action={supprimerDocumentGenere} message="Supprimer ce document ?">
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Envoi par email" description={d.bail ? "Le document est joint en PDF au message adressé au locataire." : "Rattachez le document à un bail (ci-dessous) pour l'envoyer au locataire."} />
          <CardBody>
            {d.bail ? (
              <EnvoiEmail
                action={envoyerDocumentGenere.bind(null, d.id)}
                actionIA={genererEmail.bind(null, d.bail.id)}
                destinataire={d.bail.locataire.email}
                objetDefaut={d.titre}
                corpsDefaut={`Bonjour ${d.bail.locataire.civilite ? `${d.bail.locataire.civilite} ${d.bail.locataire.nom}` : "Madame, Monsieur"},\n\nVeuillez trouver ci-joint le document « ${d.titre} » concernant votre location (${d.bail.lot.nom}).\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n${bailleur?.representant ? `${bailleur.representant}\n${bailleur.nom}` : bailleur?.nom ?? ""}`}
                contexteIA={`Email d'accompagnement du document « ${d.titre} » (${CATEGORIES_MODELE[d.categorie]}) joint en PDF.`}
                libelleBouton={d.dateEnvoi ? "Renvoyer par email" : "Envoyer par email"}
                pieceJointe="le document"
                mailConfigure={mailConfigure()}
                iaConfiguree={iaConfiguree()}
              />
            ) : (
              <p className="text-sm text-slate-500">Aucun bail rattaché.</p>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre="Texte du document" />
          <CardBody>
            <DocumentEditeur
              actionEnregistrer={modifierDocumentGenere.bind(null, d.id)}
              actionAdapter={adapterDocumentIA.bind(null, d.id)}
              initial={{ titre: d.titre, categorie: d.categorie, bailId: d.bailId, contenu: d.contenu }}
              baux={baux.map((b) => ({ id: b.id, libelle: `${b.lot.nom} — ${nomComplet(b.locataire)} (${TYPES_BAIL_COURT[b.type].toLowerCase()}, du ${formatDate(b.dateDebut)})` }))}
              iaConfiguree={iaConfiguree()}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
