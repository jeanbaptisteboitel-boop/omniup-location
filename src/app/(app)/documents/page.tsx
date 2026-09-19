import Link from "next/link";
import type { CategorieModele } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { texteParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE } from "@/lib/libelles";
import { formatDate } from "@/lib/dates";
import { entiteCouranteId } from "@/lib/entite";
import { Badge, ButtonLink, Card, EmptyState, Filtres, PageHeader, Segments, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";

export const metadata = { title: "Documents" };

const ORDRE: CategorieModele[] = ["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"];

export default async function DocumentsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const filtre = texteParam(sp, "categorie") as CategorieModele | null;
  const categorie = filtre && ORDRE.includes(filtre) ? filtre : null;
  const statutParam = texteParam(sp, "statut");
  const statut = statutParam === "brouillon" || statutParam === "envoye" ? statutParam : null;
  const entiteId = await entiteCouranteId();
  const documents = await prisma.documentGenere.findMany({
    where: { entiteId, ...(categorie ? { categorie } : {}), ...(statut === "envoye" ? { dateEnvoi: { not: null } } : statut === "brouillon" ? { dateEnvoi: null } : {}) },
    include: { bail: { include: { lot: true, locataires: includeLocataires } }, modele: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });
  const lien = (s: string | null) => {
    const p = new URLSearchParams();
    if (categorie) p.set("categorie", categorie);
    if (s) p.set("statut", s);
    const chaine = p.toString();
    return `/documents${chaine ? `?${chaine}` : ""}`;
  };
  return (
    <>
      <PageHeader titre="Documents" sousTitre="Contrats, courriers et avenants générés à partir des modèles." actions={<ButtonLink href="/modeles">Nouveau document</ButtonLink>} />
      <Flash sp={sp} />
      <Filtres>
        <Segments
          items={[
            { href: lien(null), libelle: "Tous", actif: statut === null },
            { href: lien("brouillon"), libelle: "Brouillon", actif: statut === "brouillon" },
            { href: lien("envoye"), libelle: "Envoyé", actif: statut === "envoye" },
          ]}
        />
        <FiltresForm>
          {statut && <input type="hidden" name="statut" value={statut} />}
          <div className="w-[260px] max-w-full">
            <Select name="categorie" aria-label="Catégorie" vide="Toutes les catégories" options={ORDRE.map((c) => ({ value: c, label: CATEGORIES_MODELE[c] }))} defaultValue={categorie ?? ""} />
          </div>
        </FiltresForm>
      </Filtres>
      {documents.length === 0 ? (
        <EmptyState titre="Aucun document" description="Générez un contrat depuis une fiche bail ou un courrier depuis un modèle." action={<ButtonLink href="/modeles">Nouveau document</ButtonLink>} />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Titre</Th>
                <Th>Bail</Th>
                <Th>Date</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/documents/${d.id}`} className="font-semibold text-navy-900 hover:text-brand-cyan-dark">
                      {d.titre}
                    </Link>
                    {d.modele && <span className="block text-xs text-slate-500">Modèle : {d.modele.nom}</span>}
                  </Td>
                  <Td className="text-slate-600">
                    {d.bail ? (
                      <Link href={`/baux/${d.bail.id}`} className="hover:text-navy-900 hover:underline">
                        {d.bail.lot.nom} · {nomsLocataires(d.bail.locataires)}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(d.createdAt)}</Td>
                  <Td>{d.dateEnvoi ? <Badge ton="vert">Envoyé</Badge> : <Badge ton="gris">Brouillon</Badge>}</Td>
                </tr>
              ))}
            </tbody>
          </Tableau>
          <TableauPied pagination={false}>
            {documents.length} {documents.length > 1 ? "documents" : "document"} · page 1 sur 1
          </TableauPied>
        </Card>
      )}
    </>
  );
}
