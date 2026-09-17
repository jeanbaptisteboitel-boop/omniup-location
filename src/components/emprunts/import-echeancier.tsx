"use client";

import { useActionState, useMemo } from "react";
import type { FormState } from "@/lib/forms";
import { COLONNES, LIBELLES_COLONNES, type Colonne } from "@/lib/emprunts";
import type { ApercuImport } from "@/actions/emprunts";
import { Checkbox, Field, FormMessage, Input, SubmitButton } from "@/components/form";
import { Alerte, Tableau, Td, Th } from "@/components/ui";

export function ImportEcheancier({
  actionAnalyser,
  actionImporter,
  iaConfiguree,
  aDejaDesEcheances,
}: {
  actionAnalyser: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionImporter: (prev: FormState, fd: FormData) => Promise<FormState>;
  iaConfiguree: boolean;
  aDejaDesEcheances: boolean;
}) {
  const [etatAnalyse, analyser] = useActionState(actionAnalyser, null);
  const [etatImport, importer] = useActionState(actionImporter, null);
  const apercu = useMemo<ApercuImport | null>(() => {
    if (!etatAnalyse?.ok || !etatAnalyse.values?.apercu) return null;
    try {
      return JSON.parse(etatAnalyse.values.apercu) as ApercuImport;
    } catch {
      return null;
    }
  }, [etatAnalyse]);

  return (
    <div className="space-y-6">
      <form action={analyser} className="space-y-4">
        <FormMessage state={etatAnalyse} />
        <Field
          label="Fichier de l'échéancier"
          name="fichier"
          requis
          error={etatAnalyse?.errors?.fichier}
          hint={iaConfiguree ? "CSV ou Excel (lecture directe) ; PDF ou image du tableau d'amortissement de la banque (lecture par l'assistant IA)." : "CSV ou Excel. L'import d'un PDF ou d'une image nécessite l'assistant IA (ANTHROPIC_API_KEY)."}
        >
          <Input name="fichier" type="file" accept=".csv,.txt,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/*" invalide={!!etatAnalyse?.errors?.fichier} className="file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-navy-800" />
        </Field>
        <SubmitButton variante="secondary" enCours="Analyse en cours (jusqu'à une minute pour un PDF)…">Analyser le fichier</SubmitButton>
      </form>

      {apercu && (
        <form action={importer} className="space-y-4 rounded-lg border border-navy-100 bg-navy-50/40 p-4">
          <FormMessage state={etatImport} />
          <input type="hidden" name="apercu" value={etatAnalyse?.values?.apercu ?? ""} />
          {apercu.source === "tableau" ? (
            <>
              <p className="text-sm font-semibold text-navy-900">Correspondance des colonnes</p>
              <p className="text-xs text-slate-500">{apercu.lignes.length} lignes détectées. Vérifiez que chaque information est lue dans la bonne colonne (date et intérêts obligatoires ; le capital est déduit du total s'il manque).</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {COLONNES.map((c: Colonne) => (
                  <label key={c} className="block text-sm">
                    <span className="mb-1 block text-xs font-medium text-slate-600">{LIBELLES_COLONNES[c]}{c === "date" || c === "interets" ? " *" : ""}</span>
                    <select name={`col_${c}`} defaultValue={apercu.mapping[c] !== undefined ? String(apercu.mapping[c]) : ""} className="block w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option value="">— non présent —</option>
                      {apercu.entetes.map((h, i) => (
                        <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="text-xs font-medium text-slate-600">Aperçu des premières lignes</p>
              <div className="max-h-64 overflow-auto rounded border border-slate-200 bg-white">
                <Tableau>
                  <thead className="bg-slate-50"><tr>{apercu.entetes.map((h, i) => <Th key={i}>{h || `Col. ${i + 1}`}</Th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {apercu.lignes.slice(0, 8).map((l, i) => (
                      <tr key={i}>{apercu.entetes.map((_, j) => <Td key={j}>{l[j] === null || l[j] === undefined ? "" : String(l[j])}</Td>)}</tr>
                    ))}
                  </tbody>
                </Tableau>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-navy-900">Échéances lues par l'assistant IA ({apercu.echeances.length})</p>
              {apercu.remarques && <Alerte ton="orange" titre="Remarques de l'assistant">{apercu.remarques}</Alerte>}
              <div className="max-h-72 overflow-auto rounded border border-slate-200 bg-white">
                <Tableau>
                  <thead className="bg-slate-50"><tr><Th>Date</Th><Th droite>Capital</Th><Th droite>Intérêts</Th><Th droite>Assurance</Th><Th droite>Total</Th><Th droite>Restant dû</Th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {apercu.echeances.map((x, i) => (
                      <tr key={i}><Td>{x.date}</Td><Td droite>{x.capital}</Td><Td droite>{x.interets}</Td><Td droite>{x.assurance}</Td><Td droite>{x.total}</Td><Td droite>{x.capitalRestant ?? ""}</Td></tr>
                    ))}
                  </tbody>
                </Tableau>
              </div>
              <p className="text-xs text-slate-500">Vérifiez quelques lignes avec le document original avant de confirmer.</p>
            </>
          )}
          {aDejaDesEcheances && <Checkbox name="remplacer" label="Remplacer l'échéancier existant" hint="Décochez pour ajouter ces lignes à la suite" defaultChecked />}
          {!aDejaDesEcheances && <input type="hidden" name="remplacer" value="on" />}
          <SubmitButton enCours="Import…">Confirmer l'import</SubmitButton>
        </form>
      )}
    </div>
  );
}
