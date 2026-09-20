import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { formatDateHeure } from "@/lib/dates";
import { STATUTS_TICKET, TONS_TICKET, TONS_TYPE_TICKET, TYPES_TICKET, adresseAssistance, numeroTicket, ticketOuvert } from "@/lib/tickets";
import { entiteCouranteId } from "@/lib/entite";
import { Alerte, Badge, Card, CardHeader, EmptyState, PageHeader, Segments, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";

export const metadata = { title: "Assistance" };
export const dynamic = "force-dynamic";

const FILTRES = [
  { cle: "", libelle: "Tous" },
  { cle: "OUVERTS", libelle: "Ouverts" },
  { cle: "NOUVEAU", libelle: "Nouveaux" },
  { cle: "EN_COURS", libelle: "En cours" },
  { cle: "RESOLU", libelle: "Résolus" },
  { cle: "FERME", libelle: "Fermés" },
];

export default async function TicketsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtre = texteParam(sp, "statut") ?? "";
  const entiteId = await entiteCouranteId();
  const tickets = await prisma.ticket.findMany({ where: { entiteId }, orderBy: { createdAt: "desc" } });
  const visibles = tickets.filter((t) => (filtre === "" ? true : filtre === "OUVERTS" ? ticketOuvert(t) : t.statut === filtre));
  const ouverts = tickets.filter(ticketOuvert);
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  const assistance = adresseAssistance();

  return (
    <>
      <PageHeader
        titre="Assistance"
        sousTitre="Vos demandes d'aide, signalements de problème et propositions d'amélioration. Ouvrez-en une depuis le bouton « Aide », en bas à droite de chaque page."
      />
      <Flash sp={sp} />

      {!assistance && (
        <Alerte ton="bleu" className="mb-6">
          Aucune adresse d'assistance n'est configurée : les tickets sont conservés ici sans être transmis par email. Renseignez <code className="font-semibold">SUPPORT_EMAIL</code> pour les recevoir automatiquement.
        </Alerte>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle="Tickets ouverts" valeur={String(ouverts.length)} detail={ouverts.length ? "en attente de traitement" : "aucune demande en cours"} ton={ouverts.length ? "orange" : "vert"} />
        <Stat libelle="Problèmes signalés" valeur={String(tickets.filter((t) => t.type === "BUG").length)} detail="depuis l'ouverture du dossier" />
        <Stat libelle="Améliorations proposées" valeur={String(tickets.filter((t) => t.type === "FONCTIONNALITE").length)} detail="idées transmises à l'éditeur" />
      </div>

      <Card>
        <CardHeader
          titre="Tickets"
          description={`${pluriel(visibles.length, "ticket", "tickets")} · les pièces jointes et la page d'origine sont conservées avec chaque demande.`}
          actions={<Segments items={FILTRES.map((f) => ({ href: f.cle ? `/tickets?statut=${f.cle}` : "/tickets", libelle: f.libelle, actif: filtre === f.cle }))} />}
        />
        {visibles.length === 0 ? (
          <EmptyState
            className="m-5"
            titre={tickets.length === 0 ? "Aucun ticket" : "Aucun ticket pour ce filtre"}
            description={tickets.length === 0 ? "Utilisez le bouton « Aide » en bas à droite pour poser une question, signaler un problème ou proposer une amélioration." : "Changez de filtre pour voir les autres demandes."}
          />
        ) : (
          <>
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>N°</Th>
                  <Th>Objet</Th>
                  <Th>Nature</Th>
                  <Th>Ouvert par</Th>
                  <Th>Statut</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibles.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <Td className="whitespace-nowrap font-semibold text-navy-900">
                      <Link href={`/tickets/${t.id}`} className="hover:underline">{numeroTicket(t.id)}</Link>
                    </Td>
                    <Td>
                      <Link href={`/tickets/${t.id}`} className="font-semibold text-navy-900 hover:underline">{t.objet}</Link>
                      <span className="block text-[13px] text-slate-500">{formatDateHeure(t.createdAt)}{t.page ? ` · ${t.page}` : ""}</span>
                    </Td>
                    <Td><Badge ton={TONS_TYPE_TICKET[t.type]}>{TYPES_TICKET[t.type]}</Badge></Td>
                    <Td className="text-[13px] text-slate-600">{t.auteurNom}</Td>
                    <Td><Badge ton={TONS_TICKET[t.statut]}>{STATUTS_TICKET[t.statut]}</Badge></Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
            <TableauPied pagination={false}>{pluriel(visibles.length, "ticket affiché", "tickets affichés")}{assistance ? ` · transmis à ${assistance}` : ""}</TableauPied>
          </>
        )}
      </Card>
    </>
  );
}
