"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { FormMessage, SubmitButton, Textarea } from "@/components/form";

/** Note de suivi interne d'un ticket d'assistance. */
export function SuiviForm({ action, suivi }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; suivi: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Textarea name="suivi" rows={4} defaultValue={suivi} placeholder="ex. Réponse de l'assistance du 21/09 : correction prévue à la prochaine mise à jour." />
      <div>
        <SubmitButton variante="secondary">Enregistrer le suivi</SubmitButton>
      </div>
    </form>
  );
}
