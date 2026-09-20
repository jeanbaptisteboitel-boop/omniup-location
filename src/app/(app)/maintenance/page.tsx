import Link from "next/link";
import type { StatutMaintenance, UrgenceMaintenance } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { entiteCouranteId } from "@/lib/entite";
import { compterDemandes, demandesEntite } from "@/lib/maintenance";
import { CATEGORIES_MAINTENANCE, STATUTS_MAINTENANCE, URGENCES_MAINTENANCE, nomComplet, options } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { Card, EmptyState, Filtres, PageHeader, Stat, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { BadgeStatutMaintenance, BadgeUrgence } from "@/components/maintenance/badges";

export const metadata = { title: "Maintenance" };
export const dynamic = "force-dynamic";

const STATUTS = Object.keys(STATUTS_MAINTENANCE) as StatutMaintenance[];
const URGENCES = Object.keys(URGENCES_MAINTENANCE) as UrgenceMaintenance[];

export default async function MaintenancePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const statutParam = texteParam(sp, "statut") as StatutMaintenance | null;
  const urgenceParam = texteParam(sp, "urgence") as UrgenceMaintenance | null;
  const statut = statutParam && STATUTS.includes(statutParam) ? statutParam : null;
  const urgence = urgenceParam && URGENCES.includes(urgenceParam) ? urgenceParam : null;
  const lotId = entierParam(sp, "lotId");
  const entiteId = await entiteCouranteId();
  const [demandes, toutes, lots] = await Promise.all([
    demandesEntite(entiteId, { statut, urgence, lotId }),
    prisma.demandeMaintenance.findMany({ where: { entiteId }, select: { statut: true, urgence: true } }),
    prisma.lot.findMany({ where: { entiteId }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);
  const c = compterDemandes(toutes);
  const filtre = statut || urgence || lotId;

  return (
    <>
      <PageHeader titre="Maintenance" sousTitre="Demandes d'intervention déposées par vos locataires depuis leur espace." />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat libelle="En cours" valeur={String(c.ouvertes)} detail={`${c.total} demande${c.total > 1 ? "s" : ""} au total`} ton="bleu" />
        <Stat libelle="Nouvelles" valeur={String(c.nouvelles)} detail="pas encore prises en compte" ton={c.nouvelles > 0 ? "cyan" : "gris"} />
        <Stat libelle="Urgentes en cours" valeur={String(c.urgentes)} detail="urgentes ou très urgentes" ton={c.urgentes > 0 ? "rouge" : "gris"} />
        <Stat libelle="Clôturées" valeur={String(c.cloturees)} detail="résolues ou refusées" ton="vert" />
      </div>
      <Filtres className="mt-6">
        <FiltresForm>
          <div className="w-[220px] max-w-full">
            <Select name="statut" aria-label="Statut" vide="Tous les statuts" options={options(STATUTS_MAINTENANCE)} defaultValue={statut ?? ""} />
          </div>
          <div className="w-[190px] max-w-full">
            <Select name="urgence" aria-label="Urgence" vide="Toutes les urgences" options={options(URGENCES_MAINTENANCE)} defaultValue={urgence ?? ""} />
          </div>
          <div className="w-[220px] max-w-full">
            <Select name="lotId" aria-label="Lot" vide="Tous les lots" options={lots.map((l) => ({ value: String(l.id), label: l.nom }))} defaultValue={lotId ? String(lotId) : ""} />
          </div>
          {filtre && (
            <Link href="/maintenance" className="text-[13px] text-slate-500 hover:text-navy-800">
              Réinitialiser
            </Link>
          )}
        </FiltresForm>
      </Filtres>
      {demandes.length === 0 ? (
        <EmptyState
          className="mt-6"
          titre={filtre ? "Aucune demande pour ce filtre" : "Aucune demande de maintenance"}
          description={filtre ? "Modifiez les filtres pour voir les autres demandes." : "Vos locataires déposent leurs demandes depuis leur espace ; elles arrivent ici et vous êtes prévenu par email."}
        />
      ) : (
        <Card className="mt-6">
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Demande</Th>
                <Th>Lot</Th>
                <Th>Locataire</Th>
                <Th>Urgence</Th>
                <Th>Statut</Th>
                <Th>Déposée le</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demandes.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/maintenance/${d.id}`} className="font-semibold text-navy-900 hover:text-brand-cyan-dark">
                      {d.objet}
                    </Link>
                    <span className="block text-xs text-slate-500">
                      {CATEGORIES_MAINTENANCE[d.categorie]} · {d.messages.length} message{d.messages.length > 1 ? "s" : ""}
                    </span>
                  </Td>
                  <Td className="text-slate-600">
                    <Link href={`/lots/${d.lot.id}`} className="hover:text-navy-900 hover:underline">
                      {d.lot.nom}
                    </Link>
                  </Td>
                  <Td className="text-slate-600">{d.locataire ? nomComplet(d.locataire) : "—"}</Td>
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
            {demandes.length} demande{demandes.length > 1 ? "s" : ""} · triées par urgence puis par date
          </TableauPied>
        </Card>
      )}
    </>
  );
}
