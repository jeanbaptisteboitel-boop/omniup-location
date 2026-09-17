"use client";

import { useActionState } from "react";
import type { ModeleDocument } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_MODELE, options } from "@/lib/libelles";
import { VARIABLES_MODELE } from "@/lib/modeles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export function ModeleForm({ action, initial, annulerHref }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; initial: Partial<ModeleDocument>; annulerHref: string }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  return (
    <form action={formAction} className="space-y-5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nom du modèle" name="nom" requis error={e.nom} className="sm:col-span-2">
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} />
        </Field>
        <Field label="Catégorie" name="categorie" requis error={e.categorie}>
          <Select name="categorie" options={options(CATEGORIES_MODELE)} defaultValue={valeurInitiale(state, "categorie", initial.categorie ?? "AUTRE")} />
        </Field>
        <Field label="Description" name="description" error={e.description} className="sm:col-span-3" hint="Quand utiliser ce modèle, textes applicables…">
          <Input name="description" defaultValue={valeurInitiale(state, "description", initial.description)} />
        </Field>
      </div>
      <Field label="Contenu du modèle" name="contenu" requis error={e.contenu} hint="Titres : « # » et « ## » ; listes : « - » ; variables entre doubles accolades, ex. {{bail.loyerHC}} ; champs à compléter entre crochets.">
        <Textarea name="contenu" rows={28} defaultValue={valeurInitiale(state, "contenu", initial.contenu)} invalide={!!e.contenu} className="font-mono text-xs leading-relaxed" />
      </Field>
      <details className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-xs">
        <summary className="cursor-pointer font-semibold text-navy-900">Variables disponibles ({VARIABLES_MODELE.length})</summary>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {VARIABLES_MODELE.map((v) => (
            <li key={v.cle}><code className="rounded bg-white px-1 py-0.5 text-navy-800">{`{{${v.cle}}}`}</code> <span className="text-slate-600">{v.description}</span></li>
          ))}
        </ul>
      </details>
      <FormActions>
        <SubmitButton>Enregistrer le modèle</SubmitButton>
        <ButtonLink href={annulerHref} variante="ghost">Retour</ButtonLink>
      </FormActions>
    </form>
  );
}
