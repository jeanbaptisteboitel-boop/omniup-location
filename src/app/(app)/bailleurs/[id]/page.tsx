import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { TYPES_LOT, TYPES_PERSONNE, adresseSurPlusieursLignes } from "@/lib/libelles";
import { supprimerBailleur } from "@/actions/bailleurs";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";

export default async function BailleurPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const b = await prisma.bailleur.findUnique({
    where: { id },
    include: { lots: { orderBy: { nom: "asc" }, include: { immeuble: true } }, immeubles: { orderBy: { nom: "asc" }, include: { _count: { select: { lots: true } } } } },
  });
  if (!b) notFound();

  return (
    <>
      <PageHeader
        titre={b.nom}
        sousTitre={<Badge ton="bleu">{TYPES_PERSONNE[b.typePersonne]}</Badge>}
        retour={{ href: "/bailleurs", libelle: "Bailleurs" }}
        actions={
          <>
            <ButtonLink href={`/bailleurs/${b.id}/modifier`} variante="secondary">Modifier</ButtonLink>
            <ConfirmForm action={supprimerBailleur} message={`Supprimer le bailleur « ${b.nom} » ? Ses lots et immeubles seront conservés sans propriétaire.`}>
              <input type="hidden" name="id" value={b.id} />
              <Button type="submit" variante="danger">Supprimer</Button>
            </ConfirmForm>
          </>
        }
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Coordonnées" />
          <CardBody>
            <Infos
              items={[
                { label: "Représentant", valeur: b.representant },
                { label: "SIREN", valeur: b.siren },
                { label: "Adresse", valeur: adresseSurPlusieursLignes(b).map((l, i) => <span key={i} className="block">{l}</span>) },
                { label: "Contact", valeur: [b.email, b.telephone].filter(Boolean).map((l, i) => <span key={i} className="block">{l}</span>) },
                { label: "IBAN", valeur: b.iban },
                { label: "BIC", valeur: b.bic },
                { label: "Notes", valeur: b.notes && <span className="whitespace-pre-line">{b.notes}</span> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre={`Lots (${b.lots.length})`} actions={<ButtonLink href="/lots/nouveau" taille="sm" variante="secondary">Nouveau lot</ButtonLink>} />
          {b.lots.length === 0 ? (
            <CardBody><p className="text-sm text-slate-500">Aucun lot rattaché à ce bailleur.</p></CardBody>
          ) : (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Désignation</Th><Th>Type</Th><Th>Adresse</Th><Th>Immeuble</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {b.lots.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <Td><Link href={`/lots/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.nom}</Link></Td>
                    <Td>{TYPES_LOT[l.type]}</Td>
                    <Td>{l.adresse}, {l.codePostal} {l.ville}</Td>
                    <Td>{l.immeuble ? <Link href={`/immeubles/${l.immeuble.id}`} className="hover:underline">{l.immeuble.nom}</Link> : "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
        </Card>

        {b.immeubles.length > 0 && (
          <Card>
            <CardHeader titre={`Immeubles (${b.immeubles.length})`} />
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Nom</Th><Th>Adresse</Th><Th droite>Lots</Th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {b.immeubles.map((i) => (
                  <tr key={i.id} className="hover:bg-slate-50">
                    <Td><Link href={`/immeubles/${i.id}`} className="font-medium text-navy-800 hover:underline">{i.nom}</Link></Td>
                    <Td>{i.adresse}, {i.codePostal} {i.ville}</Td>
                    <Td droite>{i._count.lots}</Td>
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
