"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { FormMessage, Input, SubmitButton } from "@/components/form";

export function EmailTest({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <FormMessage state={state} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-64">
          <label htmlFor="email" className="mb-1 block text-xs font-medium">Adresse de test</label>
          <Input name="email" type="email" placeholder="vous@exemple.fr" required />
        </div>
        <SubmitButton variante="secondary" enCours="Envoi…">Envoyer un email de test</SubmitButton>
      </div>
    </form>
  );
}
