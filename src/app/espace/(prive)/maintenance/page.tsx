import Link from "next/link";
import type { SearchParams } from "@/lib/params";
import { exigerLocataire } from "@/lib/espace";
import { bauxPourDemande, demandesDuLocataire, estOuverte, reponseNonLue } from "@/lib/maintenance";
import { CATEGORIES_MAINTENANCE } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { Alerte, Badge, ButtonLink, Card, EmptyState, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { BadgeStatutMaintenance, BadgeUrgence } from "@/components/maintenance/badges";

export const metadata = { title: "Mes demandes" };
export const dynamic = "force-dynamic";

export default async function EspaceMaintenancePage({ searchParams }: { searchParams: SearchParams }) {
  const l = await exigerLocataire();
  const sp = await searchParams;
  const [demandes, baux] = await Promise.all([demandesDuLocataire(l.id), bauxPourDemande(l.id)]);
  const enCours = demandes.filter((d) => estOuverte(d.statut)).length;

  return (
    <>
      <PageHeader
        titre="Mes demandes"
        sousTitre="Signalez un problème dans votre logement et suivez son traitement."
        retour={{ href: "/espace", libelle: "Mon espace" }}
        actions={baux.length > 0 && <ButtonLink href="/espace/maintenance/nouvelle">Nouvelle demande</ButtonLink>}
      />
      <Flash sp={sp} />
      {baux.length === 0 && (
        <Alerte ton="orange" titre="Aucun bail en cours" className="mb-6">
          Les demandes d'intervention sont réservées aux baux en cours. Contactez directement votre bailleur.
        </Alerte>
      )}
      {demandes.length === 0 ? (
        <EmptyState
          titre="Aucune demande"
          description="Fuite, panne de chauffage, serrure bloquée… décrivez le problème et joignez une photo : votre bailleur est prévenu immédiatement."
          action={baux.length > 0 && <ButtonLink href="/espace/maintenance/nouvelle">Déposer une demande</ButtonLink>}
        />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Demande</Th>
                <Th>Logement</Th>
                <Th>Urgence</Th>
                <Th>Statut</Th>
                <Th>Déposée le</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/espace/maintenance/${d.id}`} className="font-semibold text-navy-900 hover:text-brand-cyan-dark">
                      {d.objet}
                    </Link>
                    {reponseNonLue(d) && <Badge ton="cyan" className="ml-2">Nouvelle réponse</Badge>}
                    <span className="block text-xs text-slate-500">{CATEGORIES_MAINTENANCE[d.categorie]}</span>
                  </Td>
                  <Td className="text-slate-600">{d.lot.nom}</Td>
                  <Td><BadgeUrgence urgence={d.urgence} /></Td>
                  <Td>
                    <BadgeStatutMaintenance statut={d.statut} />
                    {d.statut === "PLANIFIEE" && d.interventionLe && <span className="block text-xs text-slate-500">le {formatDate(d.interventionLe)}</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(d.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <TableauPied pagination={false}>
            {demandes.length} demande{demandes.length > 1 ? "s" : ""} · {enCours} en cours
          </TableauPied>
        </Card>
      )}
    </>
  );
}
