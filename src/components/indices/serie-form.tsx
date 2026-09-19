"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";

/** Ajout d'une série INSEE à suivre : l'idbank est contrôlé auprès de l'INSEE avant enregistrement. */
export function SerieForm({ action }: { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);
  const frequence = valeurInitiale(state, "frequence", "Q");
  return (
    <form ref={ref} action={formAction} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Code" name="code" requis error={e.code} hint="Ex. : IPC, SMIC_H. Un code déjà suivi remplace la série précédente.">
          <Input name="code" defaultValue={valeurInitiale(state, "code", "")} invalide={!!e.code} placeholder="IPC" className="uppercase" />
        </Field>
        <Field label="Idbank INSEE" name="idbank" requis error={e.idbank} hint="9 chiffres, à relever sur insee.fr (série BDM).">
          <Input name="idbank" inputMode="numeric" defaultValue={valeurInitiale(state, "idbank", "")} invalide={!!e.idbank} placeholder="001759970" className="font-mono" />
        </Field>
        <Field label="Libellé" name="libelle" requis error={e.libelle} className="sm:col-span-2">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", "")} invalide={!!e.libelle} placeholder="Indice des prix à la consommation, ensemble des ménages" />
        </Field>
        <Field label="Fréquence" name="frequence" requis error={e.frequence}>
          <Select key={frequence} name="frequence" options={[{ value: "M", label: "Mensuelle" }, { value: "Q", label: "Trimestrielle" }, { value: "A", label: "Annuelle" }]} defaultValue={frequence} invalide={!!e.frequence} />
        </Field>
        <Field label="Base" name="base" error={e.base} hint="Facultatif · ex. : base 100 en 2015">
          <Input name="base" defaultValue={valeurInitiale(state, "base", "")} invalide={!!e.base} />
        </Field>
      </div>
      <div>
        <SubmitButton enCours="Vérification auprès de l'INSEE…">Ajouter la série</SubmitButton>
      </div>
    </form>
  );
}
