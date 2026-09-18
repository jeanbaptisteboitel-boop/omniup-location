import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { entierParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE } from "@/lib/libelles";
import { aujourdhui, formatDate } from "@/lib/dates";
import { arrondir2, formatEuros, somme } from "@/lib/montants";
import { CATEGORIES_SYNTHESE, calculerSynthese } from "@/lib/synthese";
import { ButtonLink, Card, CardHeader, EmptyState, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { IconeTelecharger } from "@/components/icones";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Synthèse annuelle" };

const LIGNE = "px-5 py-2.5 text-slate-600";
const MONTANT = "px-5 py-2.5 text-right tabular-nums";
const ENTETE = "py-2.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500";

export default async function SynthesePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const auj = aujourdhui();
  const anneeCourante = auj.getUTCFullYear();
  const annee = entierParam(sp, "annee") ?? anneeCourante;
  const entiteId = await entiteCouranteId();
  const [{ lignes, total, annees }, appelsAnnee] = await Promise.all([
    calculerSynthese(annee, entiteId),
    prisma.appelLoyer.findMany({ where: { periode: { startsWith: `${annee}-` }, bail: { entiteId } }, select: { total: true, paiements: { select: { montant: true } } } }),
  ]);
  // Loyers appelés dans l'année et non encaissés (information, hors total des recettes).
  const impayes = somme(appelsAnnee.map((a) => Math.max(0, arrondir2(a.total - somme(a.paiements.map((p) => p.montant))))));
  const interetsEtAssurance = arrondir2(total.interets + total.assurance + total.depenses.INTERETS_EMPRUNT);
  const depensesDeductibles = arrondir2(total.totalDepenses - total.depenses.INTERETS_EMPRUNT);
  const categories = CATEGORIES_SYNTHESE.filter((c) => c !== "INTERETS_EMPRUNT" && total.depenses[c] !== 0);
  const totalDepenses = arrondir2(depensesDeductibles + interetsEtAssurance);
  // Années proposées : celles connues par la synthèse, plus l'année demandée dans l'URL si elle n'en fait pas partie.
  const anneesProposees = Array.from(new Set([...annees, annee])).sort((x, y) => y - x);

  return (
    <>
      <PageHeader
        titre="Synthèse annuelle"
        sousTitre="Préparation de la déclaration des revenus fonciers (formulaire 2044)."
        actions={
          <>
            <FiltresForm>
              <div>
                <Select name="annee" aria-label="Année" defaultValue={String(annee)} options={anneesProposees.map((a) => ({ value: String(a), label: String(a) }))} className="font-semibold" />
              </div>
            </FiltresForm>
            <ButtonLink href={`/api/export/encaissements.csv?annee=${annee}`} variante="secondary" title={`Encaissements ${annee} au format CSV`}><IconeTelecharger taille={16} />Encaissements CSV</ButtonLink>
            <ButtonLink href={`/api/export/depenses.csv?annee=${annee}`} title={`Dépenses ${annee} au format CSV`}><IconeTelecharger taille={16} />Dépenses CSV</ButtonLink>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat libelle={`Recettes ${annee}`} valeur={formatEuros(total.loyers)} detail="loyers encaissés hors charges" ton="cyan" />
        <Stat libelle="Dépenses déductibles" valeur={formatEuros(depensesDeductibles)} detail="hors intérêts d'emprunt" />
        <Stat libelle="Intérêts d'emprunt" valeur={formatEuros(interetsEtAssurance)} detail="assurance comprise" />
        <Stat libelle="Résultat foncier" valeur={formatEuros(total.resultat)} detail={annee >= anneeCourante ? `provisoire au ${formatDate(auj)} · régime réel` : "exercice clos · régime réel"} sombre />
      </div>

      <div className="mb-6 grid grid-cols-1 items-start gap-6 md:grid-cols-2">
        <Card>
          <CardHeader titre="Recettes" />
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className={LIGNE}>Loyers hors charges encaissés</td>
                <td className={MONTANT}>{formatEuros(total.loyers)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className={LIGNE}>Provisions sur charges encaissées</td>
                <td className={MONTANT}>{formatEuros(total.charges)}</td>
              </tr>
              <tr className="border-t border-slate-100">
                <td className={LIGNE}>Loyers appelés non encaissés</td>
                <td className={`${MONTANT} text-red-700`}>{formatEuros(impayes)}</td>
              </tr>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-3 font-bold text-navy-900">Total recettes</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{formatEuros(total.recettes)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
        <Card>
          <CardHeader titre="Dépenses par catégorie" />
          <table className="w-full text-sm">
            <tbody>
              {categories.length === 0 && interetsEtAssurance === 0 && (
                <tr>
                  <td colSpan={2} className="px-5 py-2.5 text-slate-400">Aucune dépense enregistrée en {annee}.</td>
                </tr>
              )}
              {categories.map((c, i) => (
                <tr key={c} className={i > 0 ? "border-t border-slate-100" : ""}>
                  <td className={LIGNE}>{CATEGORIES_DEPENSE[c]}</td>
                  <td className={MONTANT}>{formatEuros(total.depenses[c])}</td>
                </tr>
              ))}
              {(categories.length > 0 || interetsEtAssurance !== 0) && (
                <tr className={categories.length > 0 ? "border-t border-slate-100" : ""}>
                  <td className={LIGNE}>Intérêts d'emprunt et assurance</td>
                  <td className={MONTANT}>{formatEuros(interetsEtAssurance)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-3 font-bold text-navy-900">Total dépenses</td>
                <td className="px-5 py-3 text-right font-bold tabular-nums">{formatEuros(totalDepenses)}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>

      {lignes.length === 0 ? (
        <EmptyState titre={`Aucune donnée pour ${annee}`} description="Aucun bien, encaissement ou dépense n'est enregistré sur cette année." />
      ) : (
        <Card>
          <CardHeader titre="Résultat par bien" description="Lots, puis immeubles pour les dépenses communes." />
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className={`${ENTETE} px-5 text-left`}>Bien</th>
                <Th droite>Recettes</Th>
                <Th droite>Dépenses</Th>
                <Th droite>Intérêts</Th>
                <th scope="col" className={`${ENTETE} px-5 text-right`}>Résultat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignes.map((l) => (
                <tr key={l.cle} className="hover:bg-slate-50">
                  <td className="px-5 py-3 align-top">
                    <Link href={l.type === "lot" ? `/lots/${l.id}` : `/immeubles/${l.id}`} className="font-semibold text-navy-900 hover:underline">{l.nom}</Link>
                    <span className="block text-xs text-slate-500">{l.type === "immeuble" ? "Immeuble · " : ""}{l.ville}{l.bailleur ? ` · ${l.bailleur}` : ""}</span>
                  </td>
                  <Td droite>{formatEuros(l.recettes)}</Td>
                  <Td droite>{formatEuros(l.totalDepenses)}</Td>
                  <Td droite>{formatEuros(arrondir2(l.interets + l.assurance))}</Td>
                  <td className={`px-5 py-3 text-right align-top font-bold tabular-nums ${l.resultat >= 0 ? "text-emerald-800" : "text-red-700"}`}>{formatEuros(l.resultat)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-5 py-2.5 font-semibold text-slate-600">Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(total.recettes)}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(total.totalDepenses)}</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(arrondir2(total.interets + total.assurance))}</td>
                <td className={`px-5 py-2.5 text-right font-bold tabular-nums ${total.resultat >= 0 ? "text-emerald-800" : "text-red-700"}`}>{formatEuros(total.resultat)}</td>
              </tr>
            </tfoot>
          </Tableau>
        </Card>
      )}
      <p className="mt-4 text-xs text-slate-500">Les recettes correspondent aux paiements encaissés dans l'année (loyers et charges ventilés au prorata de chaque échéance). Les dépenses sont retenues à leur date. Les intérêts et l'assurance proviennent des échéanciers d'emprunt. Les dépenses saisies en catégorie « Intérêts d'emprunt » ne doivent pas faire double emploi avec un échéancier importé.</p>
    </>
  );
}
