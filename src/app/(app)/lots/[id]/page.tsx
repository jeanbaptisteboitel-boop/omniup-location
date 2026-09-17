import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, STATUTS_BAIL, TYPES_BAIL_COURT, TYPES_LOT, adresseSurPlusieursLignes, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros, formatNombre, somme } from "@/lib/montants";
import { supprimerLot } from "@/actions/lots";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutBail } from "@/components/baux/badge-statut";
import { entiteCouranteId } from "@/lib/entite";

export default async function LotPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const lot = await prisma.lot.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: {
      bailleur: true,
      immeuble: true,
      baux: { orderBy: { dateDebut: "desc" }, include: { locataire: true } },
      depenses: { orderBy: { date: "desc" }, take: 10 },
      emprunts: { orderBy: { libelle: "asc" } },
      _count: { select: { depenses: true } },
    },
  });
  if (!lot) notFound();
  const bailActif = lot.baux.find((b) => b.statut === "SIGNE");

  return (
    <>
      <PageHeader
        titre={lot.nom}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            <Badge ton="bleu">{TYPES_LOT[lot.type]}</Badge>
            {lot.meuble && <Badge ton="violet">Meublé</Badge>}
            {bailActif ? <Badge ton="vert">Loué</Badge> : <Badge ton="gris">Vacant</Badge>}
            <span>{adresseSurPlusieursLignes(lot).join(", ")}</span>
          </span>
        }
        retour={{ href: "/lots", libelle: "Lots" }}
        actions={
          <>
            <ButtonLink href={`/baux/nouveau?lotId=${lot.id}`}>Nouveau bail</ButtonLink>
            <ButtonLink href={`/lots/${lot.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerLot} message={`Supprimer le lot « ${lot.nom} » ?`}>
              <input type="hidden" name="id" value={lot.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Caractéristiques" />
          <CardBody>
            <Infos
              colonnes={3}
              items={[
                { label: "Bailleur", valeur: lot.bailleur ? <Link href={`/bailleurs/${lot.bailleur.id}`} className="text-navy-800 hover:underline">{lot.bailleur.nom}</Link> : <span className="text-amber-700">À définir (nécessaire pour les avis et quittances)</span> },
                { label: "Immeuble", valeur: lot.immeuble ? <Link href={`/immeubles/${lot.immeuble.id}`} className="text-navy-800 hover:underline">{lot.immeuble.nom}</Link> : "—" },
                { label: "Étage", valeur: lot.etage },
                { label: "Surface", valeur: lot.surface ? `${formatNombre(lot.surface, lot.surface % 1 === 0 ? 0 : 2)} m²` : null },
                { label: "Pièces", valeur: lot.nbPieces },
                { label: "Loyer indicatif", valeur: lot.loyerIndicatif !== null ? `${formatEuros(lot.loyerIndicatif)} HC${lot.chargesIndicatives ? ` + ${formatEuros(lot.chargesIndicatives)} de charges` : ""}` : null },
                { label: "Description", valeur: lot.description && <span className="whitespace-pre-line">{lot.description}</span> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre={`Baux (${lot.baux.length})`} />
          {lot.baux.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun bail pour ce lot. Créez un locataire puis un bail.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Locataire</Th><Th>Type</Th><Th>Période</Th><Th droite>Loyer HC</Th><Th>Statut</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lot.baux.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <Td><Link href={`/baux/${b.id}`} className="font-medium text-navy-800 hover:underline">{nomComplet(b.locataire)}</Link></Td>
                    <Td>{TYPES_BAIL_COURT[b.type]}</Td>
                    <Td>{formatDate(b.dateDebut)} → {formatDate(b.dateFinEffective ?? b.dateFin)}</Td>
                    <Td droite>{formatEuros(b.loyerHC)}</Td>
                    <Td><BadgeStatutBail statut={b.statut} /></Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        <Card>
          <CardHeader titre={`Dépenses (${lot._count.depenses})`} actions={<ButtonLink href={`/depenses/nouveau?lotId=${lot.id}`} taille="sm" variante="secondary">Ajouter une dépense</ButtonLink>} />
          {lot.depenses.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucune dépense enregistrée pour ce lot.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Libellé</Th><Th>Catégorie</Th><Th droite>Montant</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lot.depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td>{formatDate(d.date)}</Td>
                    <Td><Link href={`/depenses/${d.id}/modifier`} className="hover:underline">{d.libelle}</Link></Td>
                    <Td>{CATEGORIES_DEPENSE[d.categorie]}</Td>
                    <Td droite>{formatEuros(d.montant)}</Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold"><Td /><Td>Total des {lot.depenses.length} dernières</Td><Td /><Td droite>{formatEuros(somme(lot.depenses.map((d) => d.montant)))}</Td></tr>
              </tbody>
            </Tableau>
          )}
        </Card>

        {lot.emprunts.length > 0 && (
          <Card>
            <CardHeader titre={`Emprunts (${lot.emprunts.length})`} />
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Libellé</Th><Th>Banque</Th><Th droite>Montant initial</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {lot.emprunts.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td><Link href={`/emprunts/${e.id}`} className="font-medium text-navy-800 hover:underline">{e.libelle}</Link></Td>
                    <Td>{e.banque ?? "—"}</Td>
                    <Td droite>{formatEuros(e.montantInitial)}</Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          </Card>
        )}
      </div>
    </>
  );
}
