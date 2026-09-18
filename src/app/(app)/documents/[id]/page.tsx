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
import { BoutonEnvoi } from "@/components/modeles/bouton-envoi";
import { EnvoiEmail } from "@/components/envoi-email";
import { Alerte, Badge, Button, ButtonLink, Card, Infos, PageHeader } from "@/components/ui";
import { IconeApercu, IconeEnvoyer, IconeTelecharger } from "@/components/icones";
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
  const email = d.bail?.locataire.email ?? null;
  const destinataire = d.bail ? nomComplet(d.bail.locataire) : null;
  return (
    <>
      <PageHeader
        titre={d.titre}
        badge={d.dateEnvoi ? <Badge ton="vert">Envoyé</Badge> : <Badge ton="gris">Brouillon</Badge>}
        sousTitre={d.dateEnvoi ? `Envoyé le ${formatDateHeure(d.dateEnvoi)}${email ? ` à ${email}` : ""}` : "Brouillon · non envoyé"}
        retour={{ href: "/documents", libelle: "Documents" }}
        actions={
          <>
            <ConfirmForm action={supprimerDocumentGenere} titre="Supprimer ce document ?" message={`« ${d.titre} » sera retiré de vos documents. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
              <input type="hidden" name="id" value={d.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
            <ButtonLink href={`/api/documents-generes/${d.id}/document.pdf`} variante="secondary" target="_blank">
              <IconeApercu taille={16} />
              Voir le PDF
            </ButtonLink>
            <ButtonLink href={`/api/documents-generes/${d.id}/document.pdf?dl=1`} variante="secondary">
              <IconeTelecharger taille={16} />
              Télécharger le PDF
            </ButtonLink>
            <BoutonEnvoi>
              <IconeEnvoyer taille={16} />
              Envoyer par email
            </BoutonEnvoi>
          </>
        }
      />
      <Flash sp={sp} />
      <DocumentEditeur
        actionEnregistrer={modifierDocumentGenere.bind(null, d.id)}
        actionAdapter={adapterDocumentIA.bind(null, d.id)}
        initial={{ titre: d.titre, categorie: d.categorie, bailId: d.bailId, contenu: d.contenu }}
        baux={baux.map((b) => ({ id: b.id, libelle: `${b.lot.nom} — ${nomComplet(b.locataire)} (${TYPES_BAIL_COURT[b.type].toLowerCase()}, du ${formatDate(b.dateDebut)})` }))}
        iaConfiguree={iaConfiguree()}
        informations={
          <Card>
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-navy-900">Informations</h2>
            </div>
            <div className="px-4 py-3.5">
              <Infos
                colonnes={1}
                items={[
                  {
                    label: "Bail",
                    valeur: d.bail ? (
                      <Link href={`/baux/${d.bail.id}`} className="font-semibold text-navy-800 hover:underline">
                        {d.bail.lot.nom} · {nomComplet(d.bail.locataire)}
                      </Link>
                    ) : (
                      "—"
                    ),
                  },
                  { label: "Destinataire", valeur: destinataire ? `${destinataire}${email ? ` · ${email}` : ""}` : "—" },
                  { label: "Créé le", valeur: formatDate(d.createdAt) },
                  ...(d.modele
                    ? [
                        {
                          label: "Modèle",
                          valeur: (
                            <Link href={`/modeles/${d.modele.id}`} className="text-navy-800 hover:underline">
                              {d.modele.nom}
                            </Link>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
          </Card>
        }
        envoi={
          <div id="envoi" className="scroll-mt-6">
            {d.bail ? (
              <EnvoiEmail
                action={envoyerDocumentGenere.bind(null, d.id)}
                actionIA={genererEmail.bind(null, d.bail.id)}
                destinataire={email}
                objetDefaut={d.titre}
                corpsDefaut={`Bonjour ${d.bail.locataire.civilite ? `${d.bail.locataire.civilite} ${d.bail.locataire.nom}` : "Madame, Monsieur"},\n\nVeuillez trouver ci-joint le document « ${d.titre} » concernant votre location (${d.bail.lot.nom}).\n\nNous restons à votre disposition pour toute question.\n\nCordialement,\n${bailleur?.representant ? `${bailleur.representant}\n${bailleur.nom}` : (bailleur?.nom ?? "")}`}
                contexteIA={`Email d'accompagnement du document « ${d.titre} » (${CATEGORIES_MODELE[d.categorie]}) joint en PDF.`}
                libelleBouton={d.dateEnvoi ? "Renvoyer par email" : "Envoyer par email"}
                pieceJointe="le document"
                mailConfigure={mailConfigure()}
                iaConfiguree={iaConfiguree()}
              />
            ) : (
              <Alerte ton="orange">Rattachez le document à un bail (champ « Bail rattaché » ci-dessus) pour l'envoyer au locataire par email, avec le PDF en pièce jointe.</Alerte>
            )}
          </div>
        }
      />
    </>
  );
}
