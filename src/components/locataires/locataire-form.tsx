"use client";

import { useActionState } from "react";
import type { Locataire } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CIVILITES } from "@/lib/libelles";
import { toISODate } from "@/lib/dates";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ChampsAdresse } from "@/components/champs-adresse";
import { ButtonLink } from "@/components/ui";

export function LocataireForm({
  action,
  initial,
  annulerHref,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Locataire>;
  annulerHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-6">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Civilité" name="civilite" error={e.civilite}>
          <Select name="civilite" vide="—" options={CIVILITES.map((c) => ({ value: c, label: c }))} defaultValue={valeurInitiale(state, "civilite", initial.civilite)} />
        </Field>
        <div className="hidden sm:block" />
        <Field label="Nom" name="nom" requis error={e.nom}>
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} autoComplete="family-name" />
        </Field>
        <Field label="Prénom" name="prenom" requis error={e.prenom}>
          <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", initial.prenom)} invalide={!!e.prenom} autoComplete="given-name" />
        </Field>
        <Field label="Date de naissance" name="dateNaissance" error={e.dateNaissance} hint="Facultatif, reprise dans le bail">
          <Input name="dateNaissance" type="date" defaultValue={valeurInitiale(state, "dateNaissance", toISODate(initial.dateNaissance))} invalide={!!e.dateNaissance} />
        </Field>
        <div className="hidden sm:block" />
        <ChampsAdresse state={state} initial={initial} requis={false} />
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", initial.telephone)} autoComplete="tel" />
        </Field>
        <Field label="Email" name="email" error={e.email} hint="Utilisé pour l'envoi des avis d'échéance et des quittances">
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", initial.email)} invalide={!!e.email} autoComplete="email" />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} placeholder="Situation professionnelle, garant, remarques…" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>Enregistrer</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
