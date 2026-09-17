"use client";

import { useActionState } from "react";
import type { Entite } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { TYPES_ENTITE, options } from "@/lib/libelles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function EntiteForm({
  action,
  initial,
  annulerHref,
  retour,
  libelle = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Entite>;
  annulerHref?: string;
  retour?: string;
  libelle?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-4">
      <FormMessage state={state} />
      {retour && <input type="hidden" name="retour" value={retour} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nom de l'entité" name="nom" requis error={e.nom} hint="Ex. : SCI DU PORT, M. et Mme Dupont, Cabinet OMNIUP" className="sm:col-span-2">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} />
        </Field>
        <Field label="Nature" name="type" error={e.type}>
          <Select name="type" options={options(TYPES_ENTITE)} defaultValue={valeurInitiale(state, "type", initial.type ?? "AUTRE")} />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-3">
          <Textarea name="notes" rows={2} defaultValue={valeurInitiale(state, "notes", initial.notes)} placeholder="Mandat de gestion, interlocuteur, remarques…" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelle}</SubmitButton>
        {annulerHref && <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>}
      </FormActions>
    </form>
  );
}
