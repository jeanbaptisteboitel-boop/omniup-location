"use client";

import { useActionState } from "react";
import type { Bailleur } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { options, TYPES_PERSONNE } from "@/lib/libelles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ChampsAdresse } from "@/components/champs-adresse";
import { ButtonLink } from "@/components/ui";

export function BailleurForm({
  action,
  initial,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Bailleur>;
  annulerHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Type de bailleur" name="typePersonne" requis error={e.typePersonne}>
          <Select name="typePersonne" options={options(TYPES_PERSONNE)} defaultValue={valeurInitiale(state, "typePersonne", initial.typePersonne ?? "PHYSIQUE")} />
        </Field>
        <Field label="Nom ou dénomination" name="nom" requis error={e.nom} hint="Ex. : Jean Dupont, ou SCI du Port">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} />
        </Field>
        <Field label="Représentant" name="representant" error={e.representant} hint="Pour une société : nom et qualité du signataire (ex. : M. Jean Dupont, gérant)" className="sm:col-span-2">
          <Input name="representant" defaultValue={valeurInitiale(state, "representant", initial.representant)} />
        </Field>
        <ChampsAdresse state={state} initial={initial} />
        <Field label="Email" name="email" error={e.email}>
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", initial.email)} invalide={!!e.email} />
        </Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", initial.telephone)} />
        </Field>
        <Field label="SIREN" name="siren" error={e.siren} hint="Pour une société">
          <Input name="siren" defaultValue={valeurInitiale(state, "siren", initial.siren)} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="IBAN" name="iban" error={e.iban} hint="Imprimé sur les avis d'échéance pour le règlement par virement">
          <Input name="iban" defaultValue={valeurInitiale(state, "iban", initial.iban)} />
        </Field>
        <Field label="BIC" name="bic" error={e.bic}>
          <Input name="bic" defaultValue={valeurInitiale(state, "bic", initial.bic)} />
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
