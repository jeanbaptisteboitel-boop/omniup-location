import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { TYPES_LOT } from "@/lib/libelles";
import { formatEuros } from "@/lib/montants";
import { formatSurface } from "@/components/patrimoine/surface";
import { Badge, ButtonLink, Card, EmptyState, Filtres, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { Input, Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";
import { includeLocataires, nomsLocataires } from "@/lib/locataires";
import { montantsMensuels } from "@/lib/tva";

export const metadata = { title: "Lots" };

const pluriel = (n: number) => (n > 1 ? "s" : "");
const normaliser = (s: string) => s.toLocaleLowerCase("fr-FR").normalize("NFD").replace(/[̀-ͯ]/g, "");

export default async function LotsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const entiteId = await entiteCouranteId();
  const immeubleId = entierParam(sp, "immeubleId");
  const statutBrut = texteParam(sp, "statut");
  const statut = statutBrut === "LOUE" || statutBrut === "VACANT" ? statutBrut : null;
  const q = texteParam(sp, "q")?.trim() ?? "";
  const [lots, immeubles] = await Promise.all([
    prisma.lot.findMany({
      where: { entiteId },
      orderBy: [{ ville: "asc" }, { nom: "asc" }],
      include: { immeuble: true, baux: { where: { statut: "SIGNE" }, include: { locataires: includeLocataires }, orderBy: { dateDebut: "desc" }, take: 1 } },
    }),
    prisma.immeuble.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  const nbLoues = lots.filter((l) => l.baux.length > 0).length;
  const nbVacants = lots.length - nbLoues;
  const filtresActifs = immeubleId !== null || statut !== null || q !== "";
  const recherche = normaliser(q);
  const lignes = lots.filter((l) => {
    if (immeubleId !== null && l.immeubleId !== immeubleId) return false;
    const loue = l.baux.length > 0;
    if (statut === "LOUE" && !loue) return false;
    if (statut === "VACANT" && loue) return false;
    if (recherche) {
      const champs = [l.nom, l.adresse, l.codePostal, l.ville, l.immeuble?.nom, l.baux[0] ? nomsLocataires(l.baux[0].locataires) : null];
      return champs.some((v) => v && normaliser(v).includes(recherche));
    }
    return true;
  });

  return (
    <>
      <PageHeader
        titre="Lots"
        sousTitre={`${lots.length} lot${pluriel(lots.length)} · ${nbLoues} loué${pluriel(nbLoues)} · ${nbVacants} vacant${pluriel(nbVacants)}`}
        actions={<ButtonLink href="/lots/nouveau">Nouveau lot</ButtonLink>}
      />
      <Flash sp={sp} />
      {lots.length === 0 ? (
        <EmptyState titre="Aucun lot" description="Créez vos lots d'appartements et de maisons : chaque lot pourra ensuite recevoir un bail." action={<ButtonLink href="/lots/nouveau">Nouveau lot</ButtonLink>} />
      ) : (
        <>
          <Filtres>
            <FiltresForm action="/lots">
              <div className="min-w-[200px]">
                <Select name="immeubleId" aria-label="Filtrer par immeuble" vide="Tous les immeubles" options={immeubles.map((i) => ({ value: String(i.id), label: i.nom }))} defaultValue={immeubleId ? String(immeubleId) : ""} />
              </div>
              <div className="min-w-[150px]">
                <Select
                  name="statut"
                  aria-label="Filtrer par statut"
                  vide="Tous les statuts"
                  options={[
                    { value: "LOUE", label: "Loué" },
                    { value: "VACANT", label: "Vacant" },
                  ]}
                  defaultValue={statut ?? ""}
                />
              </div>
              <div className="min-w-[220px]">
                <Input name="q" aria-label="Rechercher" placeholder="Rechercher un lot…" defaultValue={q} />
              </div>
              <button type="submit" className="sr-only">Rechercher</button>
              {filtresActifs && (
                <Link href="/lots" className="text-[13px] text-slate-500 hover:text-navy-800">
                  Réinitialiser
                </Link>
              )}
            </FiltresForm>
          </Filtres>
          {lignes.length === 0 ? (
            <EmptyState
              titre="Aucun lot ne correspond"
              description="Modifiez les filtres ou créez un nouveau lot pour commencer à le louer."
              action={
                <>
                  <ButtonLink href="/lots" variante="secondary">Réinitialiser les filtres</ButtonLink>
                  <ButtonLink href="/lots/nouveau">Nouveau lot</ButtonLink>
                </>
              }
            />
          ) : (
            <Card>
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Lot</Th>
                    <Th>Immeuble</Th>
                    <Th>Type</Th>
                    <Th droite>Surface</Th>
                    <Th droite>Loyer CC</Th>
                    <Th>Locataire</Th>
                    <Th>Statut</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l) => {
                    const bail = l.baux[0];
                    const loyerCC = bail ? montantsMensuels(bail).ttc : l.loyerIndicatif !== null ? l.loyerIndicatif + (l.chargesIndicatives ?? 0) : null;
                    return (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <Td>
                          <Link href={`/lots/${l.id}`} className="whitespace-nowrap font-semibold text-navy-900 hover:underline">{l.nom}</Link>
                          {l.meuble && <span className="block text-xs text-slate-500">Meublé</span>}
                        </Td>
                        <Td className="text-slate-600">{l.immeuble ? l.immeuble.nom : <span className="text-slate-400">{l.codePostal} {l.ville}</span>}</Td>
                        <Td className="text-slate-600">{TYPES_LOT[l.type]}</Td>
                        <Td droite className="text-slate-600">{formatSurface(l.surface) ?? "—"}</Td>
                        <Td droite className="font-semibold">{loyerCC === null ? <span className="font-normal text-slate-400">—</span> : bail ? formatEuros(loyerCC) : <span className="font-normal text-slate-500">{formatEuros(loyerCC)}</span>}</Td>
                        <Td className="text-slate-600">{bail ? nomsLocataires(bail.locataires) : <span className="text-slate-400">—</span>}</Td>
                        <Td>{bail ? <Badge ton="vert">Loué</Badge> : <Badge ton="orange">Vacant</Badge>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
              <TableauPied>
                {lignes.length} lot{pluriel(lignes.length)} · page 1 sur 1
              </TableauPied>
            </Card>
          )}
        </>
      )}
    </>
  );
}
