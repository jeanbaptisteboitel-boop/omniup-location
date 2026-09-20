"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { formatEuros, formatNombre, montantPourSaisie, parseMontant } from "@/lib/montants";
import { Field, FormMessage, Input, SubmitButton, Textarea, valeurInitiale } from "@/components/form";

/** Révision manuelle du loyer : nouveau montant, date d'effet et motif (accord amiable, loyer négocié…). */
export function RevisionManuelleForm({ action, loyerActuel, dateEffetProposee }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; loyerActuel: number; dateEffetProposee: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [nouveau, setNouveau] = useState(valeurInitiale(state, "nouveauLoyer", montantPourSaisie(loyerActuel)));
  const montant = parseMontant(nouveau);
  const ecart = montant !== null && loyerActuel > 0 ? ((montant - loyerActuel) / loyerActuel) * 100 : null;

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Nouveau loyer hors charges (€)" name="nouveauLoyer" requis error={e.nouveauLoyer} hint={`Loyer actuel : ${formatEuros(loyerActuel)}`}>
          <Input name="nouveauLoyer" inputMode="decimal" value={nouveau} onChange={(ev) => setNouveau(ev.target.value)} invalide={!!e.nouveauLoyer} />
        </Field>
        <Field label="Date d'effet" name="dateEffet" requis error={e.dateEffet} hint="Mois à partir duquel le nouveau loyer s'applique ; les appels non réglés sont recalculés.">
          <Input name="dateEffet" type="date" defaultValue={valeurInitiale(state, "dateEffet", dateEffetProposee)} invalide={!!e.dateEffet} />
        </Field>
      </div>
      <Field label="Motif" name="motif" error={e.motif} hint="Conservé dans l'historique et repris dans le courrier au locataire.">
        <Textarea name="motif" rows={2} defaultValue={valeurInitiale(state, "motif", "")} placeholder="ex. Accord amiable du 15/09/2026 : loyer maintenu à 620 € après travaux" />
      </Field>
      {ecart !== null && Math.abs(ecart) > 0.005 && (
        <p className={`text-sm font-semibold ${ecart > 0 ? "text-navy-900" : "text-emerald-700"}`}>
          {ecart > 0 ? "Augmentation" : "Diminution"} de {formatNombre(Math.abs(ecart))} % · {formatEuros(Math.abs((montant ?? 0) - loyerActuel))} par mois
        </p>
      )}
      <div>
        <SubmitButton>Enregistrer la révision</SubmitButton>
      </div>
    </form>
  );
}
