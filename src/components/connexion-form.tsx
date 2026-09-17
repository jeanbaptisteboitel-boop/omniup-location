"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, SubmitButton } from "@/components/form";

export function ConnexionForm({ action, suite }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; suite: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormMessage state={state} />
      <input type="hidden" name="suite" value={suite} />
      <Field label="Mot de passe" name="motDePasse" hint="L'accès est protégé par le mot de passe défini dans les paramètres du serveur.">
        <Input name="motDePasse" type="password" autoComplete="current-password" placeholder="••••••••" autoFocus required grand invalide={!!state?.message} />
      </Field>
      <SubmitButton taille="lg" className="w-full" enCours="Connexion…">Se connecter</SubmitButton>
    </form>
  );
}
