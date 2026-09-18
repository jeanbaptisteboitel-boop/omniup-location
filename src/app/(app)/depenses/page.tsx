import Link from "next/link";
import type { CategorieDepense } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE, options } from "@/lib/libelles";
import { aujourdhui, formatDate, jourUTC } from "@/lib/dates";
import { formatEuros, somme } from "@/lib/montants";
import { parseAffectation } from "@/lib/affectation";
import { supprimerDepense } from "@/actions/depenses";
import { Badge, ButtonLink, Card, EmptyState, Filtres, IconButton, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { IconeSupprimer, IconeTelecharger } from "@/components/icones";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Dépenses" };

const SELECT = "block h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-navy-950 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30";

function pluriel(n: number, mot: string): string {
  return `${n} ${mot}${n > 1 ? "s" : ""}`;
}

export default async function DepensesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const anneeCourante = aujourdhui().getUTCFullYear();
  const annee = entierParam(sp, "annee") ?? anneeCourante;
  const categorieDemandee = texteParam(sp, "categorie");
  const categorie = categorieDemandee && categorieDemandee in CATEGORIES_DEPENSE ? (categorieDemandee as CategorieDepense) : null;
  // Bien filtré : « bien=lot:3 » (sélecteur) ou « lotId= » / « immeubleId= » (liens depuis les fiches).
  const bien = parseAffectation(texteParam(sp, "bien")) ?? (entierParam(sp, "lotId") ? { lotId: entierParam(sp, "lotId"), immeubleId: null } : entierParam(sp, "immeubleId") ? { lotId: null, immeubleId: entierParam(sp, "immeubleId") } : null);
  const cleBien = bien ? (bien.lotId ? `lot:${bien.lotId}` : `immeuble:${bien.immeubleId}`) : "";

  const entiteId = await entiteCouranteId();
  const [toutes, premiere, lots, immeubles] = await Promise.all([
    prisma.depense.findMany({ where: { entiteId, date: { gte: jourUTC(annee, 1, 1), lt: jourUTC(annee + 1, 1, 1) } }, include: { lot: true, immeuble: true }, orderBy: [{ date: "desc" }, { id: "desc" }] }),
    prisma.depense.findFirst({ where: { entiteId }, select: { date: true }, orderBy: { date: "asc" } }),
    prisma.lot.findMany({ where: { entiteId }, orderBy: [{ ville: "asc" }, { nom: "asc" }], select: { id: true, nom: true } }),
    prisma.immeuble.findMany({ where: { entiteId }, orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);
  const depenses = toutes.filter((d) => (!categorie || d.categorie === categorie) && (!bien || (bien.lotId ? d.lotId === bien.lotId : d.immeubleId === bien.immeubleId)));
  const filtreActif = !!(categorie || bien);

  const listeAnnees: number[] = [];
  for (let a = Math.max(anneeCourante, annee); a >= Math.min(premiere?.date.getUTCFullYear() ?? anneeCourante, annee); a--) listeAnnees.push(a);

  // Totaux par bien sur l'année (indépendants des filtres), sous forme de cartes-filtres.
  const parBien = new Map<string, { cle: string; nom: string; total: number; nb: number }>();
  for (const d of toutes) {
    const cle = d.lotId ? `lot:${d.lotId}` : `immeuble:${d.immeubleId}`;
    const nom = d.lot?.nom ?? d.immeuble?.nom ?? "Bien inconnu";
    const t = parBien.get(cle) ?? { cle, nom, total: 0, nb: 0 };
    t.total = somme([t.total, d.montant]);
    t.nb += 1;
    parBien.set(cle, t);
  }
  const cartes = Array.from(parBien.values()).sort((x, y) => y.total - x.total);

  const totalAnnee = somme(toutes.map((d) => d.montant));
  const total = somme(depenses.map((d) => d.montant));
  const sansFacture = toutes.filter((d) => !d.justificatifChemin).length;
  const lien = (params: Record<string, string | null>) => {
    const q = new URLSearchParams();
    const base: Record<string, string | null> = { annee: String(annee), categorie, bien: cleBien || null, ...params };
    for (const [k, v] of Object.entries(base)) if (v) q.set(k, v);
    return `/depenses?${q.toString()}`;
  };

  return (
    <>
      <PageHeader
        titre="Dépenses"
        sousTitre={`${formatEuros(totalAnnee)} en ${annee} · ${pluriel(toutes.length, "dépense")} · ${sansFacture} sans facture`}
        actions={
          <>
            <ButtonLink href={`/api/export/depenses.csv?annee=${annee}`} variante="secondary"><IconeTelecharger taille={16} />Exporter en CSV</ButtonLink>
            <ButtonLink href="/depenses/nouveau">Nouvelle dépense</ButtonLink>
          </>
        }
      />
      <Flash sp={sp} />

      <Filtres>
        <FiltresForm>
          <div>
            <select name="bien" aria-label="Bien" defaultValue={cleBien} className={`${SELECT} min-w-[200px]`}>
              <option value="">Tous les biens</option>
              {immeubles.length > 0 && (
                <optgroup label="Immeubles">
                  {immeubles.map((i) => <option key={i.id} value={`immeuble:${i.id}`}>{i.nom}</option>)}
                </optgroup>
              )}
              {lots.length > 0 && (
                <optgroup label="Lots">
                  {lots.map((l) => <option key={l.id} value={`lot:${l.id}`}>{l.nom}</option>)}
                </optgroup>
              )}
            </select>
          </div>
          <div>
            <Select name="categorie" aria-label="Catégorie" defaultValue={categorie ?? ""} vide="Toutes les catégories" options={options(CATEGORIES_DEPENSE)} />
          </div>
          <div>
            <Select name="annee" aria-label="Année" defaultValue={String(annee)} options={listeAnnees.map((a) => ({ value: String(a), label: String(a) }))} />
          </div>
          {filtreActif && <ButtonLink href={`/depenses?annee=${annee}`} variante="ghost">Réinitialiser</ButtonLink>}
        </FiltresForm>
      </Filtres>

      {cartes.length > 0 && (
        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {cartes.map((c) => {
            const actif = c.cle === cleBien;
            return (
              <Link
                key={c.cle}
                href={lien({ bien: actif ? null : c.cle })}
                aria-current={actif ? "true" : undefined}
                className={`block rounded-xl border bg-white px-[18px] py-4 text-left shadow-card transition-colors hover:bg-slate-50 ${actif ? "border-navy-800 shadow-[0_0_0_1px_#172c52]" : "border-slate-200"}`}
              >
                <span className="block truncate text-xs font-semibold uppercase tracking-[.04em] text-slate-500">{c.nom}</span>
                <span className="mt-1.5 block text-[22px] font-bold text-navy-900 tabular-nums">{formatEuros(c.total)}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{pluriel(c.nb, "dépense")}</span>
              </Link>
            );
          })}
        </div>
      )}

      {depenses.length === 0 ? (
        <EmptyState
          titre="Aucune dépense"
          description={filtreActif ? `Aucune dépense ne correspond à ces filtres pour ${annee}.` : "Enregistrez vos factures pour préparer la déclaration des revenus fonciers."}
          action={
            <>
              <ButtonLink href="/depenses/nouveau">Nouvelle dépense</ButtonLink>
              {filtreActif && <ButtonLink href={`/depenses?annee=${annee}`} variante="secondary">Réinitialiser les filtres</ButtonLink>}
            </>
          }
        />
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Date</Th>
                <Th>Libellé</Th>
                <Th>Immeuble / lot</Th>
                <Th>Catégorie</Th>
                <Th>Facture</Th>
                <Th droite>Montant</Th>
                <Th />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {depenses.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <Td className="whitespace-nowrap text-slate-600 tabular-nums">{formatDate(d.date)}</Td>
                  <Td>
                    <Link href={`/depenses/${d.id}/modifier`} className="font-semibold text-navy-900 hover:underline">{d.libelle}</Link>
                    {d.fournisseur && <span className="block text-xs text-slate-500">{d.fournisseur}</span>}
                  </Td>
                  <Td className="text-slate-600">
                    {d.lot ? (
                      <Link href={`/lots/${d.lot.id}`} className="hover:underline">{d.lot.nom}</Link>
                    ) : d.immeuble ? (
                      <Link href={`/immeubles/${d.immeuble.id}`} className="hover:underline">{d.immeuble.nom}</Link>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td><Badge ton="gris">{CATEGORIES_DEPENSE[d.categorie]}</Badge></Td>
                  <Td className="text-[13px]">
                    {d.justificatifChemin ? (
                      <a href={`/api/depenses/${d.id}/justificatif`} target="_blank" rel="noopener" title={d.justificatifNom ?? "Facture"} className="inline-block max-w-[220px] truncate align-bottom font-semibold text-navy-800 hover:text-brand-cyan-dark">{d.justificatifNom ?? "Facture"}</a>
                    ) : (
                      <span className="font-semibold text-amber-800">Aucune facture</span>
                    )}
                  </Td>
                  <Td droite className="font-semibold">{formatEuros(d.montant)}</Td>
                  <td className="px-3 py-2 text-right align-top">
                    <ConfirmForm action={supprimerDepense} titre="Supprimer cette dépense ?" message={`« ${d.libelle} » sera retirée de la synthèse annuelle.${d.justificatifChemin ? " La facture jointe sera supprimée du stockage." : ""}`} libelleConfirmer="Supprimer" className="inline-block">
                      <input type="hidden" name="id" value={d.id} />
                      <IconButton type="submit" taille="sm" variante="danger" aria-label={`Supprimer la dépense ${d.libelle}`}><IconeSupprimer taille={14} /></IconButton>
                    </ConfirmForm>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td colSpan={5} className="px-4 py-2.5 text-[13px] font-semibold text-slate-600">{pluriel(depenses.length, "dépense")}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(total)}</td>
                <td />
              </tr>
            </tfoot>
          </Tableau>
          <TableauPied>{pluriel(depenses.length, "dépense")} · page 1 sur 1</TableauPied>
        </Card>
      )}
    </>
  );
}
