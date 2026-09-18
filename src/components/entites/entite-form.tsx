"use client";

import { useActionState } from "react";
import type { Entite } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { TYPES_ENTITE, options } from "@/lib/libelles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

/**
 * Formulaire d'entité. Disposition « page » (grille deux colonnes + pied de formulaire) par défaut ;
 * avec `modale`, le formulaire prend la forme de la boîte de dialogue de la maquette (en-tête, corps, pied).
 */
export function EntiteForm({
  action,
  initial,
  annulerHref,
  retour,
  libelle = "Enregistrer",
  modale,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Entite>;
  annulerHref?: string;
  retour?: string;
  libelle?: string;
  modale?: { titre: string };
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const champs = (
    <>
      <Field label="Nom" name="nom" requis error={e.nom} hint={modale ? undefined : "Ex. : SCI DU PORT, M. et Mme Dupont, Cabinet OMNIUP"} className={modale ? "" : "sm:col-span-2"}>
        <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} placeholder="ex. SCI du Robec" />
      </Field>
      <Field label="Type" name="type" error={e.type}>
        <Select name="type" options={options(TYPES_ENTITE)} defaultValue={valeurInitiale(state, "type", initial.type ?? "AUTRE")} invalide={!!e.type} />
      </Field>
      <Field label="Notes" name="notes" error={e.notes} className={modale ? "" : "sm:col-span-2"}>
        <Textarea name="notes" rows={2} defaultValue={valeurInitiale(state, "notes", initial.notes)} invalide={!!e.notes} placeholder="Mandat de gestion, interlocuteur, remarques…" />
      </Field>
    </>
  );
  if (modale) {
    return (
      <form action={formAction} noValidate>
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-bold text-navy-900">{modale.titre}</h2>
        </div>
        <div className="flex flex-col gap-3.5 px-6 py-5">
          <FormMessage state={state} />
          {retour && <input type="hidden" name="retour" value={retour} />}
          {champs}
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
          {annulerHref && (
            <ButtonLink href={annulerHref} variante="secondary">
              Annuler
            </ButtonLink>
          )}
          <SubmitButton>{libelle}</SubmitButton>
        </div>
      </form>
    );
  }
  return (
    <form action={formAction} className="space-y-[18px]">
      <FormMessage state={state} />
      {retour && <input type="hidden" name="retour" value={retour} />}
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">{champs}</div>
      <FormActions>
        <SubmitButton>{libelle}</SubmitButton>
        {annulerHref && (
          <ButtonLink href={annulerHref} variante="secondary">
            Annuler
          </ButtonLink>
        )}
      </FormActions>
    </form>
  );
}
