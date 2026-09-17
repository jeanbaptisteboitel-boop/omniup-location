import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, TYPES_LOT, adresseSurPlusieursLignes } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { supprimerImmeuble } from "@/actions/immeubles";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export default async function ImmeublePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const i = await prisma.immeuble.findUnique({
    where: { id },
    include: {
      bailleur: true,
      lots: { orderBy: { nom: "asc" }, include: { bailleur: true, baux: { where: { statut: "SIGNE" }, include: { locataire: true } } } },
      depenses: { orderBy: { date: "desc" }, take: 10 },
      emprunts: { orderBy: { libelle: "asc" } },
      _count: { select: { depenses: true } },
    },
  });
  if (!i) notFound();

  return (
    <>
      <PageHeader
        titre={i.nom}
        sousTitre={adresseSurPlusieursLignes(i).join(", ")}
        retour={{ href: "/immeubles", libelle: "Immeubles" }}
        actions={
          <>
            <ButtonLink href={`/lots/nouveau?immeubleId=${i.id}`} variante="secondary">Ajouter un lot</ButtonLink>
            <ButtonLink href={`/immeubles/${i.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerImmeuble} message={`Supprimer l'immeuble « ${i.nom} » ? Les lots seront conservés.`}>
              <input type="hidden" name="id" value={i.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Informations" />
          <CardBody>
            <Infos
              items={[
                { label: "Bailleur", valeur: i.bailleur ? <Link href={`/bailleurs/${i.bailleur.id}`} className="text-navy-800 hover:underline">{i.bailleur.nom}</Link> : "Plusieurs propriétaires / non renseigné" },
                { label: "Nombre de lots", valeur: i.lots.length },
                { label: "Notes", valeur: i.notes && <span className="whitespace-pre-line">{i.notes}</span> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre={`Lots (${i.lots.length})`} />
          {i.lots.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun lot dans cet immeuble.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Désignation</Th><Th>Type</Th><Th>Bailleur</Th><Th>Occupation</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {i.lots.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <Td><Link href={`/lots/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.nom}</Link>{l.etage && <span className="text-slate-500"> · {l.etage}</span>}</Td>
                    <Td>{TYPES_LOT[l.type]}</Td>
                    <Td>{l.bailleur?.nom ?? "—"}</Td>
                    <Td>{l.baux[0] ? <Badge ton="vert">Loué à {l.baux[0].locataire.prenom} {l.baux[0].locataire.nom}</Badge> : <Badge ton="gris">Vacant</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        <Card>
          <CardHeader titre={`Dépenses de l'immeuble (${i._count.depenses})`} description="Dépenses communes affectées à l'immeuble entier." actions={<ButtonLink href={`/depenses/nouveau?immeubleId=${i.id}`} taille="sm" variante="secondary">Ajouter une dépense</ButtonLink>} />
          {i.depenses.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucune dépense affectée à l'immeuble.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Libellé</Th><Th>Catégorie</Th><Th droite>Montant</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {i.depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td>{formatDate(d.date)}</Td>
                    <Td><Link href={`/depenses/${d.id}/modifier`} className="hover:underline">{d.libelle}</Link></Td>
                    <Td>{CATEGORIES_DEPENSE[d.categorie]}</Td>
                    <Td droite>{formatEuros(d.montant)}</Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold"><Td className="!py-2" /><Td className="!py-2">Total des 10 dernières</Td><Td className="!py-2" /><Td droite className="!py-2">{formatEuros(somme(i.depenses.map((d) => d.montant)))}</Td></tr>
              </tbody>
            </Tableau>
          )}
        </Card>

        {i.emprunts.length > 0 && (
          <Card>
            <CardHeader titre={`Emprunts (${i.emprunts.length})`} />
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Libellé</Th><Th>Banque</Th><Th droite>Montant initial</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {i.emprunts.map((e) => (
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
