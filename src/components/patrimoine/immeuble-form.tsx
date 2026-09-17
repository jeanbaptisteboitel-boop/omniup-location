"use client";

import { useActionState } from "react";
import type { Immeuble } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ChampsAdresse } from "@/components/champs-adresse";
import { ButtonLink } from "@/components/ui";

export function ImmeubleForm({
  action,
  initial,
  bailleurs,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Immeuble>;
  bailleurs: { id: number; nom: string }[];
  annulerHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom de l'immeuble" name="nom" requis error={e.nom} hint="Ex. : Résidence Les Tilleuls, Immeuble 12 rue Jeanne d'Arc" className="sm:col-span-2">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} />
        </Field>
        <ChampsAdresse state={state} initial={initial} />
        <Field label="Bailleur propriétaire" name="bailleurId" error={e.bailleurId} hint="Si l'immeuble entier appartient à un même bailleur" className="sm:col-span-2">
          <Select
            name="bailleurId"
            vide="— Aucun / plusieurs propriétaires —"
            options={bailleurs.map((b) => ({ value: String(b.id), label: b.nom }))}
            defaultValue={valeurInitiale(state, "bailleurId", initial.bailleurId)}
          />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>Enregistrer</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
