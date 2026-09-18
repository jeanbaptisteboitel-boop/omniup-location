"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";

/** Formulaire d'envoi d'un email de test (corps et pied d'une carte). */
export function EmailTest({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction}>
      <div className="flex flex-col gap-3 px-5 py-4">
        <FormMessage state={state} />
        <Field label="Destinataire" name="email">
          <Input name="email" type="email" placeholder="vous@exemple.fr" required />
        </Field>
      </div>
      <div className="border-t border-slate-100 px-5 pb-4 pt-3">
        <SubmitButton enCours="Envoi…">Envoyer un email de test</SubmitButton>
      </div>
    </form>
  );
}
