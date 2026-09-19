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
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Bailleur>;
  annulerHref: string;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Type de bailleur" name="typePersonne" requis error={e.typePersonne}>
          <Select name="typePersonne" options={options(TYPES_PERSONNE)} defaultValue={valeurInitiale(state, "typePersonne", initial.typePersonne ?? "PHYSIQUE")} />
        </Field>
        <Field label="Nom ou dénomination" name="nom" requis error={e.nom} hint="Tel qu'il figurera sur les baux, avis d'échéance et quittances.">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} placeholder="ex. Hervé Lemaître ou SCI Les Tilleuls" />
        </Field>
        <Field label="Représentant" name="representant" error={e.representant} hint="Pour une société : nom et qualité du signataire." className="sm:col-span-2">
          <Input name="representant" defaultValue={valeurInitiale(state, "representant", initial.representant)} placeholder="ex. M. Jean Dupont, gérant" />
        </Field>
        <ChampsAdresse state={state} initial={initial} />
        <Field label="Email" name="email" error={e.email}>
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", initial.email)} invalide={!!e.email} placeholder="ex. h.lemaitre@orange.fr" />
        </Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", initial.telephone)} placeholder="ex. 06 12 45 78 90" />
        </Field>
        <Field label="SIREN" name="siren" error={e.siren} hint="Pour une société.">
          <Input name="siren" defaultValue={valeurInitiale(state, "siren", initial.siren)} inputMode="numeric" placeholder="ex. 123 456 789" />
        </Field>
        <Field label="N° de TVA intracommunautaire" name="numeroTva" error={e.numeroTva} hint="Obligatoire sur les avis d'échéance et quittances des loyers soumis à la TVA.">
          <Input name="numeroTva" defaultValue={valeurInitiale(state, "numeroTva", initial.numeroTva)} placeholder="ex. FR12 345678901" />
        </Field>
        <Field label="IBAN" name="iban" error={e.iban} hint="Imprimé sur les avis d'échéance pour le règlement par virement.">
          <Input name="iban" defaultValue={valeurInitiale(state, "iban", initial.iban)} placeholder="ex. FR76 1027 8021 3400 0203 4560 187" />
        </Field>
        <Field label="BIC" name="bic" error={e.bic}>
          <Input name="bic" defaultValue={valeurInitiale(state, "bic", initial.bic)} placeholder="ex. CMCIFR2A" />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
