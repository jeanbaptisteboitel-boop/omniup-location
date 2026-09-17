import Link from "next/link";
import type { CategorieModele } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE, nomComplet } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { entiteCouranteId } from "@/lib/entite";
import { Badge, ButtonLink, Card, EmptyState, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";

export const metadata = { title: "Documents" };

const ORDRE: CategorieModele[] = ["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"];

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtre = texteParam(sp, "categorie") as CategorieModele | null;
  const categorie = filtre && ORDRE.includes(filtre) ? filtre : null;
  const entiteId = await entiteCouranteId();
  const documents = await prisma.documentGenere.findMany({
    where: { entiteId, ...(categorie ? { categorie } : {}) },
    include: { bail: { include: { lot: true, locataire: true } }, modele: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  return (
    <>
      <PageHeader titre="Documents" sousTitre="Avenants, renouvellements, résiliations, cautions, conventions et courriers établis à partir des modèles ou de l'assistant IA." actions={<ButtonLink href="/modeles">Générer depuis un modèle</ButtonLink>} />
      <Flash sp={sp} />
      <nav className="mb-4 flex flex-wrap gap-2 text-sm">
        <Link href="/documents" className={`rounded-full px-3 py-1 ${!categorie ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>Tous</Link>
        {ORDRE.map((c) => (
          <Link key={c} href={`/documents?categorie=${c}`} className={`rounded-full px-3 py-1 ${categorie === c ? "bg-navy-800 text-white" : "bg-white text-navy-800 ring-1 ring-slate-200 hover:bg-slate-50"}`}>{CATEGORIES_MODELE[c]}</Link>
        ))}
      </nav>
      {documents.length === 0 ? (
        <EmptyState titre="Aucun document" description="Générez un avenant, un renouvellement, une résiliation ou un acte de caution à partir d'un modèle, ou enregistrez un texte rédigé par l'assistant IA." action={<ButtonLink href="/modeles">Voir les modèles</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Document</Th><Th>Catégorie</Th><Th>Bail</Th><Th>Créé le</Th><Th>Envoi</Th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td><Link href={`/documents/${d.id}`} className="font-medium text-navy-800 hover:underline">{d.titre}</Link>{d.modele && <span className="block text-xs text-slate-500">Modèle : {d.modele.nom}</span>}</Td>
                  <Td>{CATEGORIES_MODELE[d.categorie]}</Td>
                  <Td>{d.bail ? <Link href={`/baux/${d.bail.id}`} className="hover:underline">{d.bail.lot.nom} — {nomComplet(d.bail.locataire)}</Link> : <span className="text-slate-400">—</span>}</Td>
                  <Td>{formatDate(d.createdAt)}</Td>
                  <Td>{d.dateEnvoi ? <Badge ton="vert">Envoyé le {formatDate(d.dateEnvoi)}</Badge> : <Badge ton="gris">Non envoyé</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
        </Card>
      )}
    </>
  );
}
