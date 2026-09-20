import { notFound } from "next/navigation";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { exigerLocataire } from "@/lib/espace";
import { demandeDuLocataire, estOuverte, marquerLue } from "@/lib/maintenance";
import { CATEGORIES_MAINTENANCE, STATUTS_MAINTENANCE, URGENCES_MAINTENANCE } from "@/lib/libelles";
import { formatDate, formatDateHeure } from "@/lib/dates";
import { repondreLocataire, preparerPieceLocataire, signalerResolu } from "@/actions/maintenance";
import { Alerte, Button, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutMaintenance, BadgeUrgence } from "@/components/maintenance/badges";
import { FilMessages } from "@/components/maintenance/fil-messages";
import { MessageForm } from "@/components/maintenance/message-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Ma demande" };
}

export default async function EspaceDemandePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const l = await exigerLocataire();
  const id = await idDepuis(params);
  const sp = await searchParams;
  const d = await demandeDuLocataire(l.id, id);
  if (!d) notFound();
  // L'ouverture de la fiche vaut lecture : le gestionnaire voit que sa réponse a été consultée.
  await marquerLue(d.id, l.id);
  const ouverte = estOuverte(d.statut);

  return (
    <>
      <PageHeader
        titre={d.objet}
        badge={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatutMaintenance statut={d.statut} />
            <BadgeUrgence urgence={d.urgence} />
          </span>
        }
        sousTitre={`${CATEGORIES_MAINTENANCE[d.categorie]} · ${d.lot.nom} · déposée le ${formatDate(d.createdAt)}`}
        retour={{ href: "/espace/maintenance", libelle: "Mes demandes" }}
      />
      <Flash sp={sp} />

      {d.statut === "PLANIFIEE" && d.interventionLe && (
        <Alerte ton="bleu" titre={`Intervention prévue le ${formatDate(d.interventionLe)}`} className="mb-6">
          Merci de permettre l'accès au logement à cette date. Si elle ne vous convient pas, dites-le dans le fil ci-dessous.
        </Alerte>
      )}
      {!ouverte && (
        <Alerte ton={d.statut === "REFUSEE" ? "orange" : "vert"} titre={`Demande ${STATUTS_MAINTENANCE[d.statut].toLowerCase()}`} className="mb-6">
          {d.clotureeLe ? `Clôturée le ${formatDate(d.clotureeLe)}. ` : ""}
          Si le problème revient, déposez une nouvelle demande.
        </Alerte>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Échanges avec votre bailleur" description={`${d.messages.length} message${d.messages.length > 1 ? "s" : ""}`} />
            <FilMessages messages={d.messages} cote="LOCATAIRE" basePiece={`/api/espace/maintenance/${d.id}/piece`} />
          </Card>
          {ouverte && (
            <Card>
              <CardHeader
                titre="Ajouter un message"
                description="Précisez le problème, envoyez une photo ou répondez à votre bailleur."
                actions={
                  <ConfirmForm
                    action={signalerResolu}
                    titre="Le problème est résolu ?"
                    libelleConfirmer="Oui, clôturer"
                    message="La demande sera clôturée et votre bailleur en sera informé. Vous pourrez en déposer une nouvelle si le problème revient."
                  >
                    <input type="hidden" name="id" value={d.id} />
                    <Button type="submit" variante="secondary" taille="sm">Le problème est résolu</Button>
                  </ConfirmForm>
                }
              />
              <CardBody>
                <MessageForm
                  action={repondreLocataire.bind(null, d.id)}
                  preparer={preparerPieceLocataire}
                  libelle="Votre message"
                  placeholder="La fuite s'est aggravée depuis hier soir."
                />
              </CardBody>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader titre="Récapitulatif" />
          <CardBody>
            <Infos
              colonnes={1}
              items={[
                { label: "Logement", valeur: d.lot.nom },
                { label: "Catégorie", valeur: CATEGORIES_MAINTENANCE[d.categorie] },
                { label: "Urgence signalée", valeur: URGENCES_MAINTENANCE[d.urgence] },
                { label: "Statut", valeur: STATUTS_MAINTENANCE[d.statut] },
                { label: "Déposée le", valeur: formatDateHeure(d.createdAt) },
                ...(d.interventionLe ? [{ label: "Intervention", valeur: formatDate(d.interventionLe) }] : []),
                ...(d.clotureeLe ? [{ label: "Clôturée le", valeur: formatDateHeure(d.clotureeLe) }] : []),
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
