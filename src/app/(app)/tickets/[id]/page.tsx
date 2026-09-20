import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { formatDateHeure } from "@/lib/dates";
import { formatTaille } from "@/lib/storage";
import { STATUTS_TICKET, TONS_TICKET, TONS_TYPE_TICKET, TYPES_TICKET, numeroTicket, ticketOuvert } from "@/lib/tickets";
import { changerStatutTicket, enregistrerSuivi, supprimerTicket } from "@/actions/tickets";
import { entiteCouranteId } from "@/lib/entite";
import { Badge, Button, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { SuiviForm } from "@/components/tickets/suivi-form";

export const metadata = { title: "Ticket d'assistance" };
export const dynamic = "force-dynamic";

const SUITES = [
  { statut: "EN_COURS", libelle: "Marquer en cours" },
  { statut: "RESOLU", libelle: "Marquer résolu" },
  { statut: "FERME", libelle: "Fermer" },
  { statut: "NOUVEAU", libelle: "Rouvrir" },
] as const;

export default async function TicketPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const t = await prisma.ticket.findFirst({ where: { id, entiteId: await entiteCouranteId() } });
  if (!t) notFound();
  const suites = SUITES.filter((s) => s.statut !== t.statut && !(s.statut === "NOUVEAU" && ticketOuvert(t)));

  return (
    <>
      <PageHeader
        titre={t.objet}
        badge={<Badge ton={TONS_TICKET[t.statut]}>{STATUTS_TICKET[t.statut]}</Badge>}
        sousTitre={`${numeroTicket(t.id)} · ouvert le ${formatDateHeure(t.createdAt)} par ${t.auteurNom}`}
        retour={{ href: "/tickets", libelle: "Assistance" }}
        actions={
          <>
            {suites.map((s) => (
              <form key={s.statut} action={changerStatutTicket}>
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="statut" value={s.statut} />
                <Button type="submit" variante={s.statut === "RESOLU" ? "primary" : "secondary"}>{s.libelle}</Button>
              </form>
            ))}
          </>
        }
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <Card>
          <CardHeader titre="Demande" actions={<Badge ton={TONS_TYPE_TICKET[t.type]}>{TYPES_TICKET[t.type]}</Badge>} />
          <CardBody>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{t.description}</p>
            {t.chemin && (
              <p className="mt-4 text-sm">
                <a href={`/api/tickets/${t.id}/piece`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:underline">
                  {t.nomFichier ?? "Pièce jointe"} <span className="font-normal text-slate-500">({formatTaille(t.taille ?? 0)})</span>
                </a>
              </p>
            )}
          </CardBody>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader titre="Contexte" description="Joint automatiquement à l'ouverture du ticket." />
            <CardBody>
              <Infos
                colonnes={1}
                items={[
                  { label: "Auteur", valeur: `${t.auteurNom}${t.auteurEmail ? ` · ${t.auteurEmail}` : ""}` },
                  { label: "Page", valeur: t.page ?? "—" },
                  { label: "Navigateur", valeur: t.navigateur ?? "—" },
                  { label: "Transmission à l'assistance", valeur: t.envoyeLe ? `Envoyée le ${formatDateHeure(t.envoyeLe)}` : "Non transmise par email" },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader titre="Suivi" description={t.suiviLe ? `Mis à jour le ${formatDateHeure(t.suiviLe)}` : "Note interne : réponse reçue, référence, décision."} />
            <CardBody>
              <SuiviForm action={enregistrerSuivi.bind(null, t.id)} suivi={t.suivi ?? ""} />
              <div className="mt-4 border-t border-slate-100 pt-4">
                <ConfirmForm action={supprimerTicket} titre="Supprimer ce ticket ?" message="Le ticket et sa pièce jointe seront définitivement supprimés." libelleConfirmer="Supprimer">
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" variante="ghost" taille="sm">Supprimer le ticket</Button>
                </ConfirmForm>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
