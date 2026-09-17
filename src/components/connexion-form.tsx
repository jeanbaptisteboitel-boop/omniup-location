"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";

export function ConnexionForm({ action, suite }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; suite: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="suite" value={suite} />
      <Field label="Mot de passe" name="motDePasse" requis>
        <Input name="motDePasse" type="password" autoComplete="current-password" autoFocus required />
      </Field>
      <SubmitButton className="w-full" enCours="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
