import Link from "next/link";
import { entierParam, type SearchParams } from "@/lib/params";
import { exigerBailleur } from "@/lib/proprietaire";
import { CATEGORIES_DEPENSE } from "@/lib/libelles";
import { aujourdhui, formatDate } from "@/lib/dates";
import { arrondir2, formatEuros } from "@/lib/montants";
import { CATEGORIES_SYNTHESE, calculerSynthese } from "@/lib/synthese";
import { Card, CardHeader, EmptyState, PageHeader, Stat, Tableau, TableauPied, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";

export const metadata = { title: "Synthèse annuelle" };
export const dynamic = "force-dynamic";

const MONTANT = "px-4 py-3 text-right align-top tabular-nums";

/** Synthèse annuelle du bailleur : mêmes calculs que la synthèse du gestionnaire, restreints à ses lots et immeubles. */
export default async function ProprietaireSynthesePage({ searchParams }: { searchParams: SearchParams }) {
  const b = await exigerBailleur();
  const sp = await searchParams;
  const auj = aujourdhui();
  const anneeCourante = auj.getUTCFullYear();
  const annee = entierParam(sp, "annee") ?? anneeCourante;
  const { lignes, total, annees } = await calculerSynthese(annee, b.entiteId, { bailleurId: b.id });
  const categories = CATEGORIES_SYNTHESE.filter((c) => total.depenses[c] !== 0);
  const avecInterets = total.interets !== 0 || total.assurance !== 0;
  const totalDepenses = arrondir2(total.totalDepenses + total.interets + total.assurance);
  const anneesProposees = Array.from(new Set([...annees, annee])).sort((x, y) => y - x);

  return (
    <>
      <PageHeader
        titre="Synthèse annuelle"
        sousTitre={`Loyers encaissés, dépenses et résultat de vos biens en ${annee}.`}
        actions={
          <FiltresForm>
            <div>
              <Select name="annee" aria-label="Année" defaultValue={String(annee)} options={anneesProposees.map((a) => ({ value: String(a), label: String(a) }))} className="font-semibold" />
            </div>
          </FiltresForm>
        }
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat libelle={`Recettes ${annee}`} valeur={formatEuros(total.recettes)} detail={`${formatEuros(total.loyers)} de loyers + ${formatEuros(total.charges)} de charges encaissés`} ton="cyan" />
        <Stat libelle={`Dépenses ${annee}`} valeur={formatEuros(totalDepenses)} detail={avecInterets ? `dont ${formatEuros(arrondir2(total.interets + total.assurance))} d'intérêts d'emprunt et d'assurance` : "dépenses enregistrées par votre gestionnaire"} />
        <Stat libelle="Résultat" valeur={formatEuros(total.resultat)} detail={annee >= anneeCourante ? `provisoire au ${formatDate(auj)}` : "exercice clos"} sombre />
      </div>

      {lignes.length === 0 ? (
        <EmptyState titre={`Aucune donnée pour ${annee}`} description="Aucun bien, encaissement ou dépense n'est enregistré sur cette année." />
      ) : (
        <Card>
          <CardHeader titre="Résultat par bien" description="Loyers encaissés dans l'année et dépenses par catégorie, lot par lot ; les immeubles portent les dépenses communes." />
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Bien</Th>
                <Th droite>Recettes</Th>
                {categories.map((c) => (
                  <Th key={c} droite>{CATEGORIES_DEPENSE[c]}</Th>
                ))}
                {avecInterets && <Th droite>Intérêts et assurance d'emprunt</Th>}
                <Th droite>Total dépenses</Th>
                <Th droite>Résultat</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignes.map((l) => {
                const depenses = arrondir2(l.totalDepenses + l.interets + l.assurance);
                return (
                  <tr key={l.cle} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      {l.type === "lot" ? <Link href={`/proprietaire/lots/${l.id}`} className="font-semibold text-navy-900 hover:underline">{l.nom}</Link> : <span className="font-semibold text-navy-900">{l.nom}</span>}
                      <span className="block text-xs text-slate-500">{l.type === "immeuble" ? "Immeuble · " : ""}{l.ville}</span>
                    </td>
                    <td className={MONTANT}>{formatEuros(l.recettes)}</td>
                    {categories.map((c) => (
                      <td key={c} className={`${MONTANT} ${l.depenses[c] === 0 ? "text-slate-400" : ""}`}>{formatEuros(l.depenses[c])}</td>
                    ))}
                    {avecInterets && <td className={`${MONTANT} ${l.interets + l.assurance === 0 ? "text-slate-400" : ""}`}>{formatEuros(arrondir2(l.interets + l.assurance))}</td>}
                    <td className={`${MONTANT} font-semibold`}>{formatEuros(depenses)}</td>
                    <td className={`${MONTANT} font-bold ${l.resultat >= 0 ? "text-emerald-800" : "text-red-700"}`}>{formatEuros(l.resultat)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 font-semibold text-slate-600">Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(total.recettes)}</td>
                {categories.map((c) => (
                  <td key={c} className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(total.depenses[c])}</td>
                ))}
                {avecInterets && <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(arrondir2(total.interets + total.assurance))}</td>}
                <td className="px-4 py-2.5 text-right font-bold tabular-nums">{formatEuros(totalDepenses)}</td>
                <td className={`px-4 py-2.5 text-right font-bold tabular-nums ${total.resultat >= 0 ? "text-emerald-800" : "text-red-700"}`}>{formatEuros(total.resultat)}</td>
              </tr>
            </tfoot>
          </Tableau>
          <TableauPied pagination={false}>{lignes.length} bien{lignes.length > 1 ? "s" : ""} · année {annee}</TableauPied>
        </Card>
      )}
      <p className="mt-4 text-xs text-slate-500">Les recettes correspondent aux paiements encaissés dans l'année (loyers et charges). Les dépenses sont retenues à leur date ; les intérêts et l'assurance proviennent des échéanciers d'emprunt saisis par votre gestionnaire. Le résultat est indicatif et ne remplace pas votre déclaration fiscale.</p>
    </>
  );
}
