"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { MODES_PAIEMENT, options } from "@/lib/libelles";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";

export function PaiementForm({
  action,
  dateDefaut,
  montantDefaut,
  proposerQuittance,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  dateDefaut: string;
  montantDefaut: string;
  proposerQuittance: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Date du paiement" name="date" requis error={e.date}>
          <Input name="date" type="date" defaultValue={valeurInitiale(state, "date", dateDefaut)} invalide={!!e.date} />
        </Field>
        <Field label="Montant (€)" name="montant" requis error={e.montant}>
          <Input name="montant" inputMode="decimal" defaultValue={valeurInitiale(state, "montant", montantDefaut)} invalide={!!e.montant} />
        </Field>
        <Field label="Mode" name="mode" requis error={e.mode}>
          <Select name="mode" options={options(MODES_PAIEMENT)} defaultValue={valeurInitiale(state, "mode", "VIREMENT")} />
        </Field>
        <Field label="Référence" name="reference" error={e.reference} hint="N° de chèque, libellé du virement…">
          <Input name="reference" defaultValue={valeurInitiale(state, "reference", "")} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton>Enregistrer le paiement</SubmitButton>
        {proposerQuittance && <Checkbox name="envoyerQuittance" label="Envoyer la quittance par email si l'échéance est soldée" defaultChecked />}
      </div>
    </form>
  );
}
