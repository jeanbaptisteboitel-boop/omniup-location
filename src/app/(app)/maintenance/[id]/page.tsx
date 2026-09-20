import Link from "next/link";
import { notFound } from "next/navigation";
import type { StatutMaintenance } from "@prisma/client";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { entiteCouranteId } from "@/lib/entite";
import { demandeEntite, TRANSITIONS } from "@/lib/maintenance";
import { CATEGORIES_MAINTENANCE, STATUTS_MAINTENANCE, TYPES_BAIL_COURT, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { nomsLocataires } from "@/lib/locataires";
import { aujourdhui, formatDate, formatDateHeure, toISODate } from "@/lib/dates";
import { repondreDemande, changerStatutDemande, preparerPieceGestionnaire } from "@/actions/maintenance";
import { ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { Field, Input, Textarea } from "@/components/form";
import { Flash } from "@/components/flash";
import { ActionDialogue } from "@/components/baux/action-dialogue";
import { BadgeStatutMaintenance, BadgeUrgence } from "@/components/maintenance/badges";
import { FilMessages } from "@/components/maintenance/fil-messages";
import { MessageForm } from "@/components/maintenance/message-form";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return { title: "Demande de maintenance" };
}

export default async function DemandePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const d = await demandeEntite(id, await entiteCouranteId());
  if (!d) notFound();
  const possible = (s: StatutMaintenance) => TRANSITIONS[d.statut].includes(s);
  const caches = (statut: StatutMaintenance) => ({ id: String(d.id), statut });
  const demain = toISODate(new Date(aujourdhui().getTime() + 86400_000));

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
        retour={{ href: "/maintenance", libelle: "Maintenance" }}
        actions={
          <>
            {possible("PRISE_EN_COMPTE") && (
              <ActionDialogue
                action={changerStatutDemande}
                libelle={d.statut === "RESOLUE" || d.statut === "REFUSEE" ? "Rouvrir" : "Prendre en compte"}
                variante="secondary"
                titre={d.statut === "RESOLUE" || d.statut === "REFUSEE" ? "Rouvrir la demande ?" : "Prendre la demande en compte ?"}
                description="Le locataire est prévenu que sa demande est suivie. Vous pouvez joindre un mot."
                caches={caches("PRISE_EN_COMPTE")}
                libelleConfirmer="Confirmer"
              >
                <Field label="Message au locataire (facultatif)" name="message">
                  <Textarea name="message" rows={3} placeholder="Nous avons bien reçu votre demande, un artisan va vous contacter." />
                </Field>
              </ActionDialogue>
            )}
            {possible("PLANIFIEE") && (
              <ActionDialogue
                action={changerStatutDemande}
                libelle={d.statut === "PLANIFIEE" ? "Replanifier" : "Planifier"}
                variante="secondary"
                titre={d.statut === "PLANIFIEE" ? "Reporter l'intervention" : "Planifier l'intervention"}
                description="Indiquez la date convenue : elle est transmise au locataire."
                caches={caches("PLANIFIEE")}
                libelleConfirmer="Planifier l'intervention"
              >
                <Field label="Date d'intervention" name="interventionLe" requis>
                  <Input type="date" name="interventionLe" defaultValue={toISODate(d.interventionLe) || demain} />
                </Field>
                <Field label="Message au locataire (facultatif)" name="message">
                  <Textarea name="message" rows={3} placeholder="Le plombier passera entre 9 h et 12 h." />
                </Field>
              </ActionDialogue>
            )}
            {possible("RESOLUE") && (
              <ActionDialogue
                action={changerStatutDemande}
                libelle="Marquer résolue"
                titre="Clôturer la demande ?"
                description="La demande passe en « Résolue » et le fil est fermé."
                caches={caches("RESOLUE")}
                libelleConfirmer="Clôturer"
              >
                <Field label="Message au locataire (facultatif)" name="message">
                  <Textarea name="message" rows={3} placeholder="L'intervention a eu lieu, le problème est réglé." />
                </Field>
              </ActionDialogue>
            )}
            {possible("REFUSEE") && (
              <ActionDialogue
                action={changerStatutDemande}
                libelle="Refuser"
                variante="danger"
                titre="Refuser la demande ?"
                description="Le motif est obligatoire : il est envoyé au locataire et conservé dans le fil."
                caches={caches("REFUSEE")}
                libelleConfirmer="Refuser la demande"
              >
                <Field label="Motif du refus" name="message" requis>
                  <Textarea name="message" rows={3} placeholder="Cet entretien est à la charge du locataire (décret n° 87-712)." />
                </Field>
              </ActionDialogue>
            )}
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="Fil des échanges" description={`${d.messages.length} message${d.messages.length > 1 ? "s" : ""} · dernière activité le ${formatDateHeure(d.messages.at(-1)?.createdAt ?? d.createdAt)}`} />
            <FilMessages messages={d.messages} cote="GESTIONNAIRE" basePiece={`/api/maintenance/${d.id}/piece`} />
          </Card>
          <Card>
            <CardHeader titre="Répondre au locataire" description="Votre réponse est visible dans son espace ; il en est prévenu par email s'il en a un." />
            <CardBody>
              <MessageForm
                action={repondreDemande.bind(null, d.id)}
                preparer={preparerPieceGestionnaire}
                libelle="Votre réponse"
                placeholder="Bonjour, nous avons mandaté un plombier qui vous contactera pour convenir d'un rendez-vous."
              />
            </CardBody>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader titre="La demande" />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  { label: "Statut", valeur: STATUTS_MAINTENANCE[d.statut] },
                  { label: "Catégorie", valeur: CATEGORIES_MAINTENANCE[d.categorie] },
                  { label: "Déposée le", valeur: formatDateHeure(d.createdAt) },
                  ...(d.interventionLe ? [{ label: "Intervention", valeur: formatDate(d.interventionLe) }] : []),
                  ...(d.clotureeLe ? [{ label: "Clôturée le", valeur: formatDateHeure(d.clotureeLe) }] : []),
                  { label: "Lue par le locataire", valeur: d.luLocataireLe ? formatDateHeure(d.luLocataireLe) : "pas encore" },
                ]}
              />
            </CardBody>
            <div className="border-t border-slate-100 px-5 py-3">
              <ButtonLink href={`/depenses/nouveau?lotId=${d.lot.id}`} variante="secondary" taille="sm">
                Enregistrer une dépense
              </ButtonLink>
              <p className="mt-1.5 text-xs text-slate-500">Facture de l'artisan, rattachée au lot et déductible.</p>
            </div>
          </Card>
          <Card>
            <CardHeader titre="Locataire et logement" />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  {
                    label: "Locataire",
                    valeur: d.locataire ? (
                      <Link href={`/locataires/${d.locataire.id}`} className="text-navy-800 hover:underline">
                        {nomComplet(d.locataire)}
                      </Link>
                    ) : (
                      "compte supprimé"
                    ),
                  },
                  { label: "Contact", valeur: [d.locataire?.email, d.locataire?.telephone].filter(Boolean).join(" · ") || null },
                  {
                    label: "Lot",
                    valeur: (
                      <Link href={`/lots/${d.lot.id}`} className="text-navy-800 hover:underline">
                        {d.lot.nom}
                      </Link>
                    ),
                  },
                  { label: "Adresse", valeur: adresseSurUneLigne(d.lot) },
                  {
                    label: "Bail",
                    valeur: (
                      <Link href={`/baux/${d.bail.id}`} className="text-navy-800 hover:underline">
                        {TYPES_BAIL_COURT[d.bail.type]} · {nomsLocataires(d.bail.locataires)}
                      </Link>
                    ),
                  },
                ]}
              />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
