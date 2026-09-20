"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, Input, RadioCarte, SubmitButton, valeurInitiale } from "@/components/form";

/** Déclaration d'une caution par le candidat : elle recevra son propre lien pour déposer ses justificatifs. */
export function CautionForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [morale, setMorale] = useState(valeurInitiale(state, "personneMorale", "non") === "oui");

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[13px] font-semibold text-navy-900">Qui se porte caution ?</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <RadioCarte
            name="personneMorale"
            value="non"
            label="Un proche"
            aide="Parent, conjoint, ami : une personne qui s'engage sur ses propres revenus."
            checked={!morale}
            onChange={() => setMorale(false)}
          />
          <RadioCarte
            name="personneMorale"
            value="oui"
            label="Un organisme"
            aide="Employeur, association, organisme de cautionnement."
            checked={morale}
            onChange={() => setMorale(true)}
          />
        </div>
      </fieldset>

      {morale ? (
        <Field label="Dénomination de l'organisme" name="raisonSociale" requis error={e.raisonSociale}>
          <Input name="raisonSociale" defaultValue={valeurInitiale(state, "raisonSociale", "")} invalide={!!e.raisonSociale} />
        </Field>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Prénom" name="prenom" requis error={e.prenom}>
            <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", "")} invalide={!!e.prenom} />
          </Field>
          <Field label="Nom" name="nom" requis error={e.nom}>
            <Input name="nom" defaultValue={valeurInitiale(state, "nom", "")} invalide={!!e.nom} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Adresse email" name="email" requis error={e.email} hint="Son lien personnel y sera envoyé.">
          <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", "")} invalide={!!e.email} />
        </Field>
        <Field label="Téléphone" name="telephone" error={e.telephone}>
          <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", "")} invalide={!!e.telephone} />
        </Field>
      </div>

      <FormActions>
        <SubmitButton>Déclarer cette caution</SubmitButton>
      </FormActions>
    </form>
  );
}
