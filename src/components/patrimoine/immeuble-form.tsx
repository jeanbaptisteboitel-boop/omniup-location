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
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Immeuble>;
  bailleurs: { id: number; nom: string }[];
  annulerHref: string;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Nom de l'immeuble" name="nom" requis error={e.nom} hint="Tel qu'il apparaîtra dans vos listes et sur les dépenses communes." className="sm:col-span-2">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} placeholder="ex. Résidence Les Tilleuls" />
        </Field>
        <ChampsAdresse state={state} initial={initial} />
        <Field label="Bailleur propriétaire" name="bailleurId" error={e.bailleurId} hint="Si l'immeuble entier appartient à un même bailleur ; sinon, le bailleur se choisit lot par lot." className="sm:col-span-2">
          <Select
            name="bailleurId"
            vide="Aucun / plusieurs propriétaires"
            options={bailleurs.map((b) => ({ value: String(b.id), label: b.nom }))}
            defaultValue={valeurInitiale(state, "bailleurId", initial.bailleurId)}
          />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} placeholder="Syndic, digicode, particularités…" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
