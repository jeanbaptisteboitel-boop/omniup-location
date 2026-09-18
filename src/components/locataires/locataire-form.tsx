"use client";

import { useActionState } from "react";
import type { Locataire } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CIVILITES } from "@/lib/libelles";
import { toISODate } from "@/lib/dates";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function LocataireForm({
  action,
  initial,
  annulerHref,
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Locataire>;
  annulerHref: string;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  // Après une erreur serveur, React réinitialise le formulaire : le <select> est remonté (key) sur la valeur re-soumise.
  const civiliteInitiale = valeurInitiale(state, "civilite", initial.civilite);
  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Civilité" name="civilite" error={e.civilite}>
          <Select key={civiliteInitiale} name="civilite" vide="—" options={CIVILITES.map((c) => ({ value: c, label: c }))} defaultValue={civiliteInitiale} invalide={!!e.civilite} />
        </Field>
        <Field label="Prénom" name="prenom" requis error={e.prenom}>
          <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", initial.prenom)} invalide={!!e.prenom} autoComplete="given-name" />
        </Field>
        <Field label="Nom" name="nom" requis error={e.nom}>
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} autoComplete="family-name" />
        </Field>
        <Field label="Date de naissance" name="dateNaissance" error={e.dateNaissance} hint="Facultatif, reprise dans le bail.">
          <Input name="dateNaissance" type="date" defaultValue={valeurInitiale(state, "dateNaissance", toISODate(initial.dateNaissance))} invalide={!!e.dateNaissance} />
        </Field>
        <Field label="Email" name="email" error={e.email} hint="Utilisé pour les avis d'échéance, quittances et signatures.">
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", initial.email)} invalide={!!e.email} autoComplete="email" placeholder="prenom.nom@exemple.fr" />
        </Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", initial.telephone)} invalide={!!e.telephone} autoComplete="tel" placeholder="06 12 34 56 78" />
        </Field>
        <Field label="Adresse actuelle" name="adresse" error={e.adresse} className="sm:col-span-2">
          <Input name="adresse" defaultValue={valeurInitiale(state, "adresse", initial.adresse)} invalide={!!e.adresse} autoComplete="street-address" placeholder="N° et rue" />
        </Field>
        <Field label="Complément d'adresse" name="complementAdresse" error={e.complementAdresse} className="sm:col-span-2">
          <Input name="complementAdresse" defaultValue={valeurInitiale(state, "complementAdresse", initial.complementAdresse)} invalide={!!e.complementAdresse} placeholder="Bâtiment, étage, appartement…" />
        </Field>
        <Field label="Code postal" name="codePostal" error={e.codePostal}>
          <Input name="codePostal" inputMode="numeric" defaultValue={valeurInitiale(state, "codePostal", initial.codePostal)} invalide={!!e.codePostal} autoComplete="postal-code" />
        </Field>
        <Field label="Ville" name="ville" error={e.ville}>
          <Input name="ville" defaultValue={valeurInitiale(state, "ville", initial.ville)} invalide={!!e.ville} autoComplete="address-level2" />
        </Field>
        <Field label="Notes" name="notes" error={e.notes} className="sm:col-span-2">
          <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} invalide={!!e.notes} placeholder="Situation professionnelle, garant, remarques…" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
