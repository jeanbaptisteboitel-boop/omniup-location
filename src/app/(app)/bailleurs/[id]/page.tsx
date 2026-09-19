import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { TYPES_LOT, TYPES_PERSONNE, adresseSurPlusieursLignes, adresseSurUneLigne } from "@/lib/libelles";
import { supprimerBailleur } from "@/actions/bailleurs";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

const pluriel = (n: number) => (n > 1 ? "s" : "");

export default async function BailleurPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const b = await prisma.bailleur.findFirst({
    where: { id, entiteId: await entiteCouranteId() },
    include: {
      lots: { orderBy: { nom: "asc" }, include: { immeuble: true, baux: { where: { statut: "SIGNE" }, include: { locataires: includeLocataires }, orderBy: { dateDebut: "desc" }, take: 1 } } },
      immeubles: { orderBy: { nom: "asc" }, include: { _count: { select: { lots: true } } } },
    },
  });
  if (!b) notFound();
  const nbLoues = b.lots.filter((l) => l.baux.length > 0).length;

  return (
    <>
      <PageHeader
        titre={b.nom}
        badge={<Badge ton="bleu">{TYPES_PERSONNE[b.typePersonne]}</Badge>}
        sousTitre={[b.representant, adresseSurUneLigne(b)].filter(Boolean).join(" · ")}
        retour={{ href: "/bailleurs", libelle: "Bailleurs" }}
        actions={
          <>
            <ButtonLink href={`/bailleurs/${b.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm
              action={supprimerBailleur}
              titre="Supprimer ce bailleur ?"
              libelleConfirmer="Supprimer définitivement"
              message={`« ${b.nom} » sera supprimé. Ses lots et immeubles seront conservés sans propriétaire ; cette action est irréversible.`}
            >
              <input type="hidden" name="id" value={b.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[repeat(auto-fit,minmax(320px,1fr))]">
          <Card>
            <CardHeader titre="Coordonnées" />
            <CardBody>
              <Infos
                items={[
                  { label: "Type", valeur: TYPES_PERSONNE[b.typePersonne] },
                  { label: "Représentant", valeur: b.representant },
                  { label: "Adresse", valeur: adresseSurPlusieursLignes(b).map((l, k) => <span key={k} className="block">{l}</span>) },
                  { label: "SIREN", valeur: b.siren },
                  { label: "Email", valeur: b.email },
                  { label: "Téléphone", valeur: b.telephone },
                  { label: "IBAN", valeur: b.iban },
                  { label: "BIC", valeur: b.bic },
                  ...(b.notes ? [{ label: "Notes", valeur: <span className="whitespace-pre-line">{b.notes}</span> }] : []),
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader titre={`Immeubles (${b.immeubles.length})`} actions={<ButtonLink href="/immeubles/nouveau" taille="sm" variante="secondary">Nouvel immeuble</ButtonLink>} />
            {b.immeubles.length === 0 ? (
              <CardBody><p className="text-sm text-slate-500">Aucun immeuble rattaché à ce bailleur.</p></CardBody>
            ) : (
              <ul className="divide-y divide-slate-100">
                {b.immeubles.map((i) => (
                  <li key={i.id}>
                    <Link href={`/immeubles/${i.id}`} className="flex items-center justify-between gap-3 px-5 py-3 text-slate-900 hover:bg-slate-50">
                      <span className="min-w-0">
                        <span className="block font-semibold text-navy-900">{i.nom}</span>
                        <span className="block text-[13px] text-slate-500">{adresseSurUneLigne(i)}</span>
                      </span>
                      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-navy-50 px-2.5 py-0.5 text-xs font-semibold text-navy-800">
                        {i._count.lots} lot{pluriel(i._count.lots)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader titre={`Lots (${b.lots.length})`} actions={<ButtonLink href="/lots/nouveau" taille="sm" variante="secondary">Nouveau lot</ButtonLink>} />
          {b.lots.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun lot rattaché à ce bailleur.</p></CardBody>
          ) : (
            <>
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Lot</Th>
                    <Th>Immeuble</Th>
                    <Th>Type</Th>
                    <Th>Adresse</Th>
                    <Th>Locataire</Th>
                    <Th>Statut</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b.lots.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <Td><Link href={`/lots/${l.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{l.nom}</Link></Td>
                      <Td className="text-slate-600">{l.immeuble ? <Link href={`/immeubles/${l.immeuble.id}`} className="hover:underline">{l.immeuble.nom}</Link> : <span className="text-slate-400">—</span>}</Td>
                      <Td className="text-slate-600">{TYPES_LOT[l.type]}</Td>
                      <Td className="text-slate-600">{adresseSurUneLigne(l)}</Td>
                      <Td className="text-slate-600">{l.baux[0] ? nomsLocataires(l.baux[0].locataires) : <span className="text-slate-400">—</span>}</Td>
                      <Td>{l.baux[0] ? <Badge ton="vert">Loué</Badge> : <Badge ton="orange">Vacant</Badge>}</Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
              <TableauPied pagination={false}>
                {b.lots.length} lot{pluriel(b.lots.length)} · {nbLoues} loué{pluriel(nbLoues)} · {b.lots.length - nbLoues} vacant{pluriel(b.lots.length - nbLoues)}
              </TableauPied>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
