import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Locataires" };

export default async function LocatairesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const locataires = await prisma.locataire.findMany({
    where: { entiteId: await entiteCouranteId() },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { _count: { select: { documents: true } }, baux: { where: { statut: "SIGNE" }, include: { lot: true }, take: 1 } },
  });
  return (
    <>
      <PageHeader titre="Locataires" sousTitre="Candidats et locataires en place, avec leurs pièces d'identité et justificatifs." actions={<ButtonLink href="/locataires/nouveau">Nouveau locataire</ButtonLink>} />
      <Flash sp={sp} />
      {locataires.length === 0 ? (
        <EmptyState titre="Aucun locataire" description="Créez un locataire pour importer ses pièces d'identité et les justificatifs de sa demande de logement, puis lui établir un bail." action={<ButtonLink href="/locataires/nouveau">Créer un locataire</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Nom</Th><Th>Contact</Th><Th>Adresse</Th><Th>Logement</Th><Th droite>Documents</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {locataires.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <Td><Link href={`/locataires/${l.id}`} className="font-medium text-navy-800 hover:underline">{nomComplet(l)}</Link></Td>
                  <Td>{l.email && <span className="block">{l.email}</span>}{l.telephone && <span className="block text-slate-500">{l.telephone}</span>}</Td>
                  <Td>{adresseSurUneLigne(l) || <span className="text-slate-400">—</span>}</Td>
                  <Td>{l.baux[0] ? <Link href={`/lots/${l.baux[0].lot.id}`}><Badge ton="vert">{l.baux[0].lot.nom}</Badge></Link> : <Badge ton="gris">Candidat / sans bail</Badge>}</Td>
                  <Td droite>{l._count.documents}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
