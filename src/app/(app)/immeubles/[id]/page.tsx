import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, TYPES_LOT, adresseSurPlusieursLignes, adresseSurUneLigne } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { supprimerImmeuble } from "@/actions/immeubles";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

const pluriel = (n: number) => (n > 1 ? "s" : "");

export default async function ImmeublePage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const i = await prisma.immeuble.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: {
      bailleur: true,
      lots: { orderBy: { nom: "asc" }, include: { bailleur: true, baux: { where: { statut: "SIGNE" }, include: { locataires: includeLocataires }, orderBy: { dateDebut: "desc" }, take: 1 } } },
      depenses: { orderBy: { date: "desc" }, take: 10 },
      emprunts: { orderBy: { libelle: "asc" } },
      _count: { select: { depenses: true } },
    },
  });
  if (!i) notFound();
  const loues = i.lots.filter((l) => l.baux.length > 0);
  const vacants = i.lots.length - loues.length;
  const loyersMensuels = somme(loues.map((l) => l.baux[0].loyerHC + l.baux[0].charges));

  return (
    <>
      <PageHeader
        titre={i.nom}
        badge={
          <Badge ton="bleu">
            {i.lots.length} lot{pluriel(i.lots.length)}
          </Badge>
        }
        sousTitre={adresseSurUneLigne(i)}
        retour={{ href: "/immeubles", libelle: "Immeubles" }}
        actions={
          <>
            <ButtonLink href={`/immeubles/${i.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ButtonLink href={`/lots/nouveau?immeubleId=${i.id}`}>Ajouter un lot</ButtonLink>
            <ConfirmForm
              action={supprimerImmeuble}
              titre="Supprimer cet immeuble ?"
              libelleConfirmer="Supprimer définitivement"
              message={`« ${i.nom} » sera retiré de votre patrimoine ; ses lots seront conservés sans immeuble. Un immeuble rattaché à des dépenses ou des emprunts ne peut pas être supprimé.`}
            >
              <input type="hidden" name="id" value={i.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          <Card>
            <CardHeader titre="Informations" />
            <CardBody>
              <Infos
                items={[
                  { label: "Bailleur", valeur: i.bailleur ? <Link href={`/bailleurs/${i.bailleur.id}`} className="text-navy-800 hover:underline">{i.bailleur.nom}</Link> : <span className="text-slate-500">Plusieurs propriétaires / non renseigné</span> },
                  { label: "Adresse", valeur: adresseSurPlusieursLignes(i).map((l, k) => <span key={k} className="block">{l}</span>) },
                  ...(i.notes ? [{ label: "Notes", valeur: <span className="whitespace-pre-line">{i.notes}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader titre="Occupation" />
            <CardBody>
              <Infos
                items={[
                  { label: "Lots", valeur: i.lots.length },
                  { label: "Loués · vacants", valeur: `${loues.length} loué${pluriel(loues.length)} · ${vacants} vacant${pluriel(vacants)}` },
                  { label: "Loyers charges comprises", valeur: `${formatEuros(loyersMensuels)} / mois` },
                  { label: "Dépenses affectées", valeur: i._count.depenses },
                ]}
              />
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader titre={`Lots (${i.lots.length})`} actions={<ButtonLink href={`/lots/nouveau?immeubleId=${i.id}`} taille="sm" variante="secondary">Ajouter un lot</ButtonLink>} />
          {i.lots.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun lot dans cet immeuble.</p></CardBody>
          ) : (
            <>
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Lot</Th>
                    <Th>Type</Th>
                    <Th>Étage</Th>
                    <Th>Bailleur</Th>
                    <Th droite>Loyer CC</Th>
                    <Th>Locataire</Th>
                    <Th>Statut</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {i.lots.map((l) => {
                    const bail = l.baux[0];
                    const loyerCC = bail ? bail.loyerHC + bail.charges : l.loyerIndicatif !== null ? l.loyerIndicatif + (l.chargesIndicatives ?? 0) : null;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <Td>
                          <Link href={`/lots/${l.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{l.nom}</Link>
                          {l.meuble && <span className="block text-xs text-slate-500">Meublé</span>}
                        </Td>
                        <Td className="text-slate-600">{TYPES_LOT[l.type]}</Td>
                        <Td className="text-slate-600">{l.etage ?? "—"}</Td>
                        <Td className="text-slate-600">{l.bailleur?.nom ?? <span className="text-slate-400">—</span>}</Td>
                        <Td droite className="font-semibold">{loyerCC === null ? <span className="font-normal text-slate-400">—</span> : bail ? formatEuros(loyerCC) : <span className="font-normal text-slate-500">{formatEuros(loyerCC)}</span>}</Td>
                        <Td className="text-slate-600">{bail ? nomsLocataires(bail.locataires) : <span className="text-slate-400">—</span>}</Td>
                        <Td>{bail ? <Badge ton="vert">Loué</Badge> : <Badge ton="orange">Vacant</Badge>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
              <TableauPied pagination={false}>
                {i.lots.length} lot{pluriel(i.lots.length)} · {loues.length} loué{pluriel(loues.length)} · {vacants} vacant{pluriel(vacants)}
              </TableauPied>
            </>
          )}
        </Card>

        <Card>
          <CardHeader titre={`Dépenses de l'immeuble (${i._count.depenses})`} description="Dépenses communes affectées à l'immeuble entier." actions={<ButtonLink href={`/depenses/nouveau?immeubleId=${i.id}`} taille="sm" variante="secondary">Ajouter une dépense</ButtonLink>} />
          {i.depenses.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucune dépense affectée à l'immeuble.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Date</Th>
                  <Th>Libellé</Th>
                  <Th>Catégorie</Th>
                  <Th droite>Montant</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {i.depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <Td className="text-slate-600 tabular-nums">{formatDate(d.date)}</Td>
                    <Td><Link href={`/depenses/${d.id}/modifier`} className="font-semibold text-navy-900 hover:underline">{d.libelle}</Link></Td>
                    <Td className="text-slate-600">{CATEGORIES_DEPENSE[d.categorie]}</Td>
                    <Td droite className="font-semibold">{formatEuros(d.montant)}</Td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-semibold">
                  <Td className="py-2!" />
                  <Td className="whitespace-nowrap py-2!">Total des {i.depenses.length} dernières</Td>
                  <Td className="py-2!" />
                  <Td droite className="py-2!">{formatEuros(somme(i.depenses.map((d) => d.montant)))}</Td>
                </tr>
              </tbody>
            </Tableau>
          )}
        </Card>

        {i.emprunts.length > 0 && (
          <Card>
            <CardHeader titre={`Emprunts (${i.emprunts.length})`} />
            <Tableau>
              <thead className="bg-slate-50">
                <tr>
                  <Th>Libellé</Th>
                  <Th>Banque</Th>
                  <Th droite>Montant initial</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {i.emprunts.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td><Link href={`/emprunts/${e.id}`} className="font-semibold text-navy-900 hover:underline">{e.libelle}</Link></Td>
                    <Td className="text-slate-600">{e.banque ?? "—"}</Td>
                    <Td droite className="font-semibold">{formatEuros(e.montantInitial)}</Td>
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
