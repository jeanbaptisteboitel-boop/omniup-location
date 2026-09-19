import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { TYPES_COURRIER } from "@/lib/libelles";
import { aujourdhui, formatDate, formatDateHeure } from "@/lib/dates";
import { etatAppel } from "@/lib/loyers";
import { chargerCourrier } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { emailCourrier } from "@/lib/mail-modeles";
import { envoyerCourrier, modifierCourrier, supprimerCourrier } from "@/actions/courriers";
import { genererCourrier, genererEmail } from "@/actions/ia";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { CourrierEditeur } from "@/components/courriers/courrier-editeur";
import { EnvoiEmail } from "@/components/envoi-email";
import { entiteCouranteId } from "@/lib/entite";
import { emailsLocataires } from "@/lib/locataires";
import { LiensLocataires } from "@/components/locataires/liens-locataires";

export default async function CourrierPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const c = await chargerCourrier(id);
  if (!c || c.bail.entiteId !== (await entiteCouranteId())) notFound();
  const [nbRevisions, appels] = await Promise.all([
    prisma.revisionLoyer.count({ where: { bailId: c.bailId } }),
    prisma.appelLoyer.findMany({ where: { bailId: c.bailId }, include: { paiements: true } }),
  ]);
  const auj = aujourdhui();
  const aDesImpayes = appels.some((a) => {
    const e = etatAppel(a, auj);
    return e.reste > 0 && e.statut !== "A_PAYER";
  });
  const modele = emailCourrier(c);

  return (
    <>
      <PageHeader
        titre={c.objet}
        badge={c.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDate(c.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}
        sousTitre={
          <span>
            {TYPES_COURRIER[c.type]} · créé le {formatDate(c.createdAt)}{c.dateEnvoi ? ` · envoyé le ${formatDateHeure(c.dateEnvoi)}` : ""} · <LiensLocataires locataires={c.bail.locataires} className="text-navy-800 hover:underline" /> · <Link href={`/baux/${c.bail.id}`} className="text-navy-800 hover:underline">{c.bail.lot.nom}</Link>
          </span>
        }
        retour={{ href: `/baux/${c.bailId}?onglet=courriers`, libelle: "Bail" }}
        actions={
          <>
            <ConfirmForm action={supprimerCourrier} titre="Supprimer ce courrier ?" message={`« ${c.objet} » sera définitivement supprimé. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
            <ButtonLink href={`/api/courriers/${c.id}/courrier.pdf`} variante="secondary" target="_blank">Voir le PDF</ButtonLink>
            <ButtonLink href={`/api/courriers/${c.id}/courrier.pdf?dl=1`} variante="secondary">Télécharger</ButtonLink>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader titre="Envoi par email" description="Le courrier est joint en PDF au message." />
          <CardBody>
            <EnvoiEmail
              action={envoyerCourrier.bind(null, c.id)}
              actionIA={genererEmail.bind(null, c.bailId)}
              destinataire={emailsLocataires(c.bail.locataires).join(", ") || null}
              objetDefaut={modele.objet}
              corpsDefaut={modele.corps}
              contexteIA={`Email d'accompagnement d'un courrier « ${c.objet} » (${TYPES_COURRIER[c.type]}) joint en PDF.`}
              libelleBouton={c.dateEnvoi ? "Renvoyer par email" : "Envoyer par email"}
              pieceJointe="le courrier"
              mailConfigure={mailConfigure()}
              iaConfiguree={iaConfiguree()}
              ouvert={!c.dateEnvoi}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre="Texte du courrier" description="Modifiez le texte puis enregistrez : le PDF est régénéré à partir de la version enregistrée." />
          <CardBody>
            <CourrierEditeur
              actionEnregistrer={modifierCourrier.bind(null, c.id)}
              actionGenerer={genererCourrier.bind(null, c.bailId)}
              initial={{ type: c.type, objet: c.objet, contenu: c.contenu }}
              iaConfiguree={iaConfiguree()}
              aDesRevisions={nbRevisions > 0}
              aDesImpayes={aDesImpayes}
              annulerHref={`/baux/${c.bailId}?onglet=courriers`}
              libelleEnregistrer="Enregistrer les modifications"
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
