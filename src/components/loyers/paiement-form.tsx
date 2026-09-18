"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { MODES_PAIEMENT, options } from "@/lib/libelles";
import { formatEuros, montantPourSaisie } from "@/lib/montants";
import { Checkbox, Field, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { Button } from "@/components/ui";

/**
 * Formulaire d'enregistrement d'un paiement, placé dans une carte « Enregistrer un paiement » :
 * champs sur une grille fluide, pied de formulaire avec le bouton d'envoi et « Solder le reste ».
 */
export function PaiementForm({
  action,
  dateDefaut,
  reste,
  proposerQuittance,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  dateDefaut: string;
  /** Reste à percevoir sur l'échéance (pré-rempli par « Solder le reste »). */
  reste: number;
  proposerQuittance: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const montantRef = useRef<HTMLInputElement>(null);
  const e = state?.errors ?? {};
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={formAction}>
      <div className="flex flex-col gap-3.5 px-5 py-4">
        <FormMessage state={state} />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          <Field label="Montant (€)" name="montant" requis error={e.montant}>
            <Input ref={montantRef} name="montant" inputMode="decimal" placeholder={montantPourSaisie(reste)} defaultValue={valeurInitiale(state, "montant", "")} invalide={!!e.montant} />
          </Field>
          <Field label="Date" name="date" requis error={e.date}>
            <Input name="date" type="date" defaultValue={valeurInitiale(state, "date", dateDefaut)} invalide={!!e.date} />
          </Field>
          <Field label="Mode" name="mode" requis error={e.mode}>
            <Select name="mode" options={options(MODES_PAIEMENT)} defaultValue={valeurInitiale(state, "mode", "VIREMENT")} invalide={!!e.mode} />
          </Field>
          <Field label="Référence" name="reference" error={e.reference} hint="N° de chèque, libellé du virement…">
            <Input name="reference" defaultValue={valeurInitiale(state, "reference", "")} invalide={!!e.reference} />
          </Field>
        </div>
        {proposerQuittance && <Checkbox name="envoyerQuittance" label="Envoyer la quittance par email si l'échéance est soldée" defaultChecked />}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 pb-4 pt-3">
        <SubmitButton enCours="Enregistrement…">Enregistrer le paiement</SubmitButton>
        <Button
          type="button"
          variante="ghost"
          onClick={() => {
            if (!montantRef.current) return;
            montantRef.current.value = montantPourSaisie(reste);
            montantRef.current.focus();
          }}
        >
          Solder le reste ({formatEuros(reste)})
        </Button>
      </div>
    </form>
  );
}
