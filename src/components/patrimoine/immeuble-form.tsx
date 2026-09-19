"use client";

import { useActionState, useState } from "react";
import type { Immeuble } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
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
  const [optionTva, setOptionTva] = useState(state?.values ? state.values.optionTva === "on" : !!initial.optionTva);
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
        <fieldset className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          <legend className="px-1 text-sm font-semibold text-navy-900">Option pour la TVA</legend>
          <Checkbox
            name="optionTva"
            label="Le bailleur a opté pour la TVA sur les loyers de cet immeuble"
            hint="Option de l'article 260 2° du CGI, exercée immeuble par immeuble pour les locaux nus à usage professionnel ou commercial. Elle rend possible la TVA sur les lots de l'immeuble (à activer ensuite lot par lot) ; les locations à usage d'habitation restent exonérées."
            checked={optionTva}
            onChange={(ev) => setOptionTva(ev.target.checked)}
          />
          {optionTva && (
            <Field label="Date d'effet de l'option" name="optionTvaDate" error={e.optionTvaDate} hint="Facultatif : premier jour du mois au cours duquel l'option a été déclarée au service des impôts." className="mt-3 max-w-xs">
              <Input name="optionTvaDate" type="date" defaultValue={valeurInitiale(state, "optionTvaDate", initial.optionTvaDate ? new Date(initial.optionTvaDate).toISOString().slice(0, 10) : "")} invalide={!!e.optionTvaDate} />
            </Field>
          )}
        </fieldset>
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
