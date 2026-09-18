/** Règles de lecture d'un tableau d'amortissement, affichées sous la zone d'import. */
export function ReglesImport() {
  return (
    <ul className="list-disc pl-[18px] text-xs leading-relaxed text-slate-500">
      <li>Colonnes reconnues : date, capital, intérêts, assurance, capital restant dû.</li>
      <li>CSV et Excel sont lus directement ; PDF et photos par OCR (Mistral, 4 Mo maximum).</li>
      <li>Vérifiez le total des intérêts avec votre attestation bancaire.</li>
    </ul>
  );
}
