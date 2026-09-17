import Link from "next/link";
import type { CategorieModele } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE } from "@/lib/libelles";
import { initialiserModelesDefaut } from "@/lib/modeles-data";
import { Badge, ButtonLink, Card, CardHeader, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { Flash } from "@/components/flash";

export const metadata = { title: "Modèles de documents" };

const ORDRE: CategorieModele[] = ["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"];

export default async function ModelesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await initialiserModelesDefaut();
  const bailId = entierParam(sp, "bailId");
  const modeles = await prisma.modeleDocument.findMany({ orderBy: [{ categorie: "asc" }, { parDefaut: "desc" }, { nom: "asc" }] });
  const suffixe = bailId ? `?bailId=${bailId}` : "";
  return (
    <>
      <PageHeader
        titre="Modèles de documents"
        sousTitre={bailId ? "Choisissez le modèle à générer pour ce bail : ses variables seront remplies automatiquement." : "Baux, avenants, renouvellements, fins de bail, cautions, conventions : modèles fournis par défaut (modifiables et réinitialisables) et modèles personnalisés, communs à toutes les entités."}
        actions={<ButtonLink href="/modeles/nouveau">Nouveau modèle</ButtonLink>}
        retour={bailId ? { href: `/baux/${bailId}`, libelle: "Bail" } : undefined}
      />
      <Flash sp={sp} />
      <div className="space-y-6">
        {ORDRE.map((c) => {
          const liste = modeles.filter((m) => m.categorie === c);
          if (liste.length === 0) return null;
          return (
            <Card key={c}>
              <CardHeader titre={`${CATEGORIES_MODELE[c]} (${liste.length})`} />
              <Tableau>
                <thead className="bg-slate-50"><tr><Th>Modèle</Th><Th>Origine</Th><Th /></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {liste.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <Td>
                        <Link href={`/modeles/${m.id}`} className="font-medium text-navy-800 hover:underline">{m.nom}</Link>
                        {m.description && <span className="block text-xs text-slate-500">{m.description}</span>}
                      </Td>
                      <Td>{m.parDefaut ? <Badge ton="bleu">Fourni par défaut</Badge> : <Badge ton="violet">Personnalisé</Badge>}</Td>
                      <Td droite>
                        <div className="flex justify-end gap-2">
                          <ButtonLink href={`/modeles/${m.id}/generer${suffixe}`} taille="sm" variante="accent">Générer un document</ButtonLink>
                          <ButtonLink href={`/modeles/${m.id}`} taille="sm" variante="secondary">Ouvrir</ButtonLink>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Tableau>
            </Card>
          );
        })}
      </div>
    </>
  );
}
