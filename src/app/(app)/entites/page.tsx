import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_ENTITE } from "@/lib/libelles";
import { avecMessage } from "@/lib/erreurs";
import { entiteCouranteId, multiEntitesActif } from "@/lib/entite";
import { changerEntite, creerEntite, supprimerEntite } from "@/actions/entites";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { EntiteForm } from "@/components/entites/entite-form";

export const metadata = { title: "Entités" };

export default async function EntitesPage({ searchParams }: { searchParams: SearchParams }) {
  if (!(await multiEntitesActif())) redirect(avecMessage("/parametres", "La gestion multi-entités n'est pas activée.", "erreur"));
  const sp = await searchParams;
  const [entites, couranteId] = await Promise.all([
    prisma.entite.findMany({ orderBy: { nom: "asc" }, include: { _count: { select: { bailleurs: true, lots: true, locataires: true, baux: true } } } }),
    entiteCouranteId(),
  ]);
  return (
    <>
      <PageHeader titre="Entités" sousTitre="Chaque entité (personne, société, mandant) dispose de ses propres bailleurs, immeubles, lots, locataires, baux, dépenses et emprunts. Les modèles de documents sont communs." />
      <Flash sp={sp} />
      <div className="space-y-6">
        <Card>
          <CardHeader titre="Nouvelle entité" />
          <CardBody>
            <EntiteForm action={creerEntite} initial={{}} libelle="Créer l'entité" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre={`Entités (${entites.length})`} />
          <Tableau>
            <thead className="bg-slate-50"><tr><Th>Nom</Th><Th>Nature</Th><Th droite>Bailleurs</Th><Th droite>Lots</Th><Th droite>Locataires</Th><Th droite>Baux</Th><Th /></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {entites.map((e) => {
                const vide = e._count.bailleurs + e._count.lots + e._count.locataires + e._count.baux === 0;
                return (
                  <tr key={e.id} className={e.id === couranteId ? "bg-navy-50/50" : "hover:bg-slate-50"}>
                    <Td>
                      <Link href={`/entites/${e.id}/modifier`} className="font-medium text-navy-800 hover:underline">{e.nom}</Link>
                      {e.id === couranteId && <Badge ton="cyan">Entité de travail</Badge>}
                      {e.notes && <span className="block text-xs text-slate-500">{e.notes}</span>}
                    </Td>
                    <Td>{TYPES_ENTITE[e.type]}</Td>
                    <Td droite>{e._count.bailleurs}</Td>
                    <Td droite>{e._count.lots}</Td>
                    <Td droite>{e._count.locataires}</Td>
                    <Td droite>{e._count.baux}</Td>
                    <Td droite>
                      <div className="flex justify-end gap-2">
                        {e.id !== couranteId && (
                          <form action={changerEntite}>
                            <input type="hidden" name="entiteId" value={e.id} />
                            <input type="hidden" name="retour" value="/" />
                            <Button type="submit" taille="sm" variante="accent">Sélectionner</Button>
                          </form>
                        )}
                        <ButtonLink href={`/entites/${e.id}/modifier`} taille="sm" variante="secondary">Modifier</ButtonLink>
                        {vide && entites.length > 1 && (
                          <ConfirmForm action={supprimerEntite} message={`Supprimer l'entité « ${e.nom} » ?`}>
                            <input type="hidden" name="id" value={e.id} />
                            <Button type="submit" taille="sm" variante="danger">Supprimer</Button>
                          </ConfirmForm>
                        )}
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        </Card>
      </div>
    </>
  );
}
