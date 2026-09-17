import Link from "next/link";
import { entierParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_DEPENSE } from "@/lib/libelles";
import { formatEuros } from "@/lib/montants";
import { CATEGORIES_SYNTHESE, calculerSynthese } from "@/lib/synthese";
import { Alerte, Card, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { entiteCouranteId } from "@/lib/entite";

export const metadata = { title: "Synthèse annuelle" };

export default async function SynthesePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const annee = entierParam(sp, "annee") ?? new Date().getFullYear();
  const { lignes, total, annees } = await calculerSynthese(annee, await entiteCouranteId());
  const categoriesUtiles = CATEGORIES_SYNTHESE.filter((c) => total.depenses[c] !== 0);

  return (
    <>
      <PageHeader
        titre={`Synthèse ${annee}`}
        sousTitre="Recettes encaissées et dépenses par bien : état préparatoire à la déclaration des revenus fonciers (2044) ou à la comptabilité de la SCI."
        actions={
          <form method="get" className="flex items-center gap-2 text-sm">
            <label htmlFor="annee" className="text-slate-500">Année</label>
            <select id="annee" name="annee" defaultValue={annee} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
              {annees.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <button type="submit" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50">Afficher</button>
          </form>
        }
      />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat libelle="Recettes encaissées" valeur={formatEuros(total.recettes)} detail={`dont loyers ${formatEuros(total.loyers)}`} ton="vert" />
        <Stat libelle="Dépenses" valeur={formatEuros(total.totalDepenses)} ton="orange" />
        <Stat libelle="Intérêts et assurance d'emprunt" valeur={formatEuros(total.interets + total.assurance)} detail={`intérêts ${formatEuros(total.interets)}`} ton="bleu" />
        <Stat libelle="Résultat" valeur={formatEuros(total.resultat)} ton={total.resultat >= 0 ? "vert" : "rouge"} />
      </div>
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <Link href={`/api/export/encaissements.csv?annee=${annee}`} className="text-navy-800 underline">Exporter les encaissements {annee} (CSV)</Link>
        <Link href={`/api/export/depenses.csv?annee=${annee}`} className="text-navy-800 underline">Exporter les dépenses {annee} (CSV)</Link>
      </div>
      {lignes.length === 0 ? (
        <Alerte ton="bleu">Aucun bien, encaissement ou dépense pour {annee}.</Alerte>
      ) : (
        <Card>
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Bien</Th>
                <Th droite>Loyers</Th>
                <Th droite>Charges</Th>
                {categoriesUtiles.map((c) => <Th key={c} droite>{CATEGORIES_DEPENSE[c]}</Th>)}
                <Th droite>Intérêts</Th>
                <Th droite>Assurance emprunt</Th>
                <Th droite>Résultat</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lignes.map((l) => (
                <tr key={l.cle} className="hover:bg-slate-50">
                  <Td>
                    <Link href={l.type === "lot" ? `/lots/${l.id}` : `/immeubles/${l.id}`} className="font-medium text-navy-800 hover:underline">{l.nom}</Link>
                    <span className="block text-xs text-slate-500">{l.type === "immeuble" ? "Immeuble (dépenses communes) · " : ""}{l.ville}{l.bailleur ? ` · ${l.bailleur}` : ""}</span>
                  </Td>
                  <Td droite>{formatEuros(l.loyers)}</Td>
                  <Td droite>{formatEuros(l.charges)}</Td>
                  {categoriesUtiles.map((c) => <Td key={c} droite>{l.depenses[c] ? formatEuros(l.depenses[c]) : <span className="text-slate-300">—</span>}</Td>)}
                  <Td droite>{l.interets ? formatEuros(l.interets) : <span className="text-slate-300">—</span>}</Td>
                  <Td droite>{l.assurance ? formatEuros(l.assurance) : <span className="text-slate-300">—</span>}</Td>
                  <Td droite className={l.resultat < 0 ? "text-red-700" : ""}><strong>{formatEuros(l.resultat)}</strong></Td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <Td>Total</Td>
                <Td droite>{formatEuros(total.loyers)}</Td>
                <Td droite>{formatEuros(total.charges)}</Td>
                {categoriesUtiles.map((c) => <Td key={c} droite>{formatEuros(total.depenses[c])}</Td>)}
                <Td droite>{formatEuros(total.interets)}</Td>
                <Td droite>{formatEuros(total.assurance)}</Td>
                <Td droite>{formatEuros(total.resultat)}</Td>
              </tr>
            </tbody>
          </Tableau>
        </Card>
      )}
      <p className="mt-4 text-xs text-slate-500">Les recettes correspondent aux paiements encaissés dans l'année (loyers et charges ventilés au prorata de chaque échéance). Les dépenses sont retenues à leur date. Les intérêts et l'assurance proviennent des échéanciers d'emprunt. Les dépenses saisies en catégorie « Intérêts d'emprunt » ne doivent pas faire double emploi avec un échéancier importé.</p>
    </>
  );
}
