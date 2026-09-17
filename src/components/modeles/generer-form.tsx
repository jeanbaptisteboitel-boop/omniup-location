"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function GenererForm({ action, baux, bailIdInitial, titreInitial, annulerHref }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; baux: { id: number; libelle: string }[]; bailIdInitial: number | null; titreInitial: string; annulerHref: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Bail concerné" name="bailId" error={e.bailId} hint="Les variables du modèle sont remplies avec le bailleur, le locataire, le lot et les conditions du bail ; sans bail, elles restent à compléter.">
        <Select name="bailId" vide="— Sans bail (champs à compléter) —" options={baux.map((b) => ({ value: String(b.id), label: b.libelle }))} defaultValue={valeurInitiale(state, "bailId", bailIdInitial)} />
      </Field>
      <Field label="Titre du document" name="titre" error={e.titre}>
        <Input name="titre" defaultValue={valeurInitiale(state, "titre", titreInitial)} />
      </Field>
      <FormActions>
        <SubmitButton variante="accent" enCours="Génération…">Générer le document</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
