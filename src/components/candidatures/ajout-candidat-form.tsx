"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";

/** Ajout d'un colocataire candidat par le gestionnaire : il reçoit son propre lien d'accès. */
export function AjoutCandidatForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[120px_1fr_1fr]">
        <Field label="Civilité" name="civilite" error={e.civilite}>
          <Select name="civilite" defaultValue={valeurInitiale(state, "civilite", "")} vide="—" options={[{ value: "M.", label: "M." }, { value: "Mme", label: "Mme" }]} />
        </Field>
        <Field label="Prénom" name="prenom" requis error={e.prenom}>
          <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", "")} invalide={!!e.prenom} />
        </Field>
        <Field label="Nom" name="nom" requis error={e.nom}>
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", "")} invalide={!!e.nom} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Adresse email" name="email" requis error={e.email}>
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", "")} invalide={!!e.email} />
        </Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", "")} invalide={!!e.telephone} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>Ajouter ce colocataire</SubmitButton>
      </FormActions>
    </form>
  );
}
