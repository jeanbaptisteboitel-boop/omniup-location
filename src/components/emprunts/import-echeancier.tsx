"use client";

import { useActionState, useMemo, useState } from "react";
import type { FormState } from "@/lib/forms";
import { COLONNES, LIBELLES_COLONNES, type Colonne } from "@/lib/emprunts";
import type { ApercuImport } from "@/actions/emprunts";
import { Checkbox, FormMessage, SubmitButton } from "@/components/form";
import { Alerte, Button, Tableau, Td, Th } from "@/components/ui";
import { Dialogue } from "@/components/dialogue";
import { ZoneFichier } from "@/components/zone-fichier";

const ACCEPT = ".csv,.txt,.xlsx,.xlsm,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf,image/*";

/**
 * Import d'un tableau d'amortissement en deux temps : analyse du fichier (zone de dépôt),
 * puis vérification de la correspondance des colonnes (ou des échéances lues par OCR) dans une boîte de dialogue avant l'import.
 */
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
  // Résultat d'analyse dont la boîte de dialogue a été refermée (une nouvelle analyse la rouvre).
  const [ferme, setFerme] = useState<FormState>(null);
  const apercu = useMemo<ApercuImport | null>(() => {
    if (!etatAnalyse?.ok || !etatAnalyse.values?.apercu) return null;
    try {
      return JSON.parse(etatAnalyse.values.apercu) as ApercuImport;
    } catch {
      return null;
    }
  }, [etatAnalyse]);
  const ouvert = !!apercu && ferme !== etatAnalyse;
  const fermer = () => setFerme(etatAnalyse);

  return (
    <div className="flex flex-col gap-3">
      <form action={analyser} className="flex flex-col gap-3">
        {etatAnalyse && !etatAnalyse.ok && <FormMessage state={etatAnalyse} />}
        <ZoneFichier
          name="fichier"
          accept={ACCEPT}
          libelle="Glissez-déposez ou cliquez"
          aide={iaConfiguree ? "CSV, Excel, PDF ou photo · lecture OCR (Mistral)" : "CSV ou Excel (l'OCR Mistral n'est pas configuré pour les PDF et photos)"}
        />
        {etatAnalyse?.errors?.fichier && <p className="text-xs text-red-600">{etatAnalyse.errors.fichier}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton variante="secondary" enCours="Analyse en cours…">Analyser le fichier</SubmitButton>
          {apercu && !ouvert && (
            <Button type="button" variante="ghost" onClick={() => setFerme(null)}>Reprendre l'aperçu</Button>
          )}
        </div>
      </form>

      {apercu && ouvert && (
        <Dialogue titre={apercu.source === "tableau" ? "Correspondance des colonnes" : `Échéances lues par OCR (Mistral) (${apercu.echeances.length})`} onFermer={fermer} largeur="max-w-[900px]">
          <form action={importer} className="flex flex-col gap-4">
            <FormMessage state={etatImport} />
            <input type="hidden" name="apercu" value={etatAnalyse?.values?.apercu ?? ""} />
            <div className="flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
              {apercu.source === "tableau" ? (
                <>
                  <p className="text-[13px] text-slate-500">{apercu.lignes.length} lignes détectées. Vérifiez que chaque information est lue dans la bonne colonne (date et intérêts obligatoires ; le capital est déduit du total s'il manque).</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {COLONNES.map((c: Colonne) => (
                      <label key={c} className="block">
                        <span className="mb-1 block text-xs font-semibold text-navy-900">{LIBELLES_COLONNES[c]}{c === "date" || c === "interets" ? " *" : ""}</span>
                        <select name={`col_${c}`} defaultValue={apercu.mapping[c] !== undefined ? String(apercu.mapping[c]) : ""} className="block h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-navy-950 focus:border-brand-cyan focus:outline-none focus:ring-2 focus:ring-brand-cyan/30">
                          <option value="">— non présent —</option>
                          {apercu.entetes.map((h, i) => (
                            <option key={i} value={i}>{h || `Colonne ${i + 1}`}</option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Aperçu des premières lignes</p>
                  <div className="max-h-56 overflow-auto rounded-lg border border-slate-200">
                    <Tableau>
                      <thead className="bg-slate-50"><tr>{apercu.entetes.map((h, i) => <Th key={i}>{h || `Col. ${i + 1}`}</Th>)}</tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {apercu.lignes.slice(0, 8).map((l, i) => (
                          <tr key={i}>{apercu.entetes.map((_, j) => <Td key={j} className="whitespace-nowrap text-slate-700">{l[j] === null || l[j] === undefined ? "" : String(l[j])}</Td>)}</tr>
                        ))}
                      </tbody>
                    </Tableau>
                  </div>
                </>
              ) : (
                <>
                  {apercu.remarques && <Alerte ton="orange" titre="Remarques de l'extraction">{apercu.remarques}</Alerte>}
                  <div className="max-h-72 overflow-auto rounded-lg border border-slate-200">
                    <Tableau>
                      <thead className="bg-slate-50"><tr><Th>Date</Th><Th droite>Capital</Th><Th droite>Intérêts</Th><Th droite>Assurance</Th><Th droite>Total</Th><Th droite>Restant dû</Th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {apercu.echeances.map((x, i) => (
                          <tr key={i}><Td className="whitespace-nowrap">{x.date}</Td><Td droite>{x.capital}</Td><Td droite>{x.interets}</Td><Td droite>{x.assurance}</Td><Td droite>{x.total}</Td><Td droite>{x.capitalRestant ?? ""}</Td></tr>
                        ))}
                      </tbody>
                    </Tableau>
                  </div>
                  <p className="text-[13px] text-slate-500">Vérifiez quelques lignes avec le document original avant de confirmer.</p>
                </>
              )}
              {aDejaDesEcheances && <Checkbox name="remplacer" label="Remplacer l'échéancier existant" hint="Décochez pour ajouter ces lignes à la suite" defaultChecked />}
              {!aDejaDesEcheances && <input type="hidden" name="remplacer" value="on" />}
            </div>
            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <Button type="button" variante="secondary" onClick={fermer}>Annuler</Button>
              <SubmitButton enCours="Import…">Confirmer l'import</SubmitButton>
            </div>
          </form>
        </Dialogue>
      )}
    </div>
  );
}
