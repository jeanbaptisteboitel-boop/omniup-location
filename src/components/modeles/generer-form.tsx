"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function GenererForm({ action, baux, bailIdInitial, titreInitial, annulerHref }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; baux: { id: number; libelle: string }[]; bailIdInitial: number | null; titreInitial: string; annulerHref: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Bail concerné" name="bailId" error={e.bailId} className="sm:col-span-2" hint="Les variables du modèle sont remplies avec le bailleur, le locataire, le lot et les conditions du bail ; sans bail, elles restent à compléter.">
          <Select name="bailId" vide="— Sans bail (champs à compléter) —" options={baux.map((b) => ({ value: String(b.id), label: b.libelle }))} defaultValue={valeurInitiale(state, "bailId", bailIdInitial)} invalide={!!e.bailId} />
        </Field>
        <Field label="Titre du document" name="titre" error={e.titre} className="sm:col-span-2">
          <Input name="titre" defaultValue={valeurInitiale(state, "titre", titreInitial)} invalide={!!e.titre} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton enCours="Génération…">Générer le document</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
