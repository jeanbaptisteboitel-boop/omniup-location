"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";

/** Renvoi du lien d'accès par email (espace locataire). */
export function LienForm({ action, mailConfigure }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; mailConfigure: boolean }) {
  const [state, formAction] = useActionState(action, null);
  if (!mailConfigure) return <p className="mt-2 text-sm text-slate-600">Demandez un nouveau lien d'accès à votre bailleur : il peut vous le renvoyer ou vous le transmettre directement.</p>;
  return (
    <form action={formAction} className="mt-2 flex flex-col gap-3">
      <FormMessage state={state} />
      <Field label="Votre adresse email" name="email" hint="Celle connue de votre bailleur.">
        <Input name="email" type="email" autoComplete="email" placeholder="prenom.nom@exemple.fr" required />
      </Field>
      <SubmitButton enCours="Envoi…" variante="secondary">Recevoir mon lien d'accès</SubmitButton>
    </form>
  );
}
