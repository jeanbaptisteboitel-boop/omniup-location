"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_DOCUMENT, options } from "@/lib/libelles";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { Field, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";

export function DocumentForm({ action, categorieInitiale }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; categorieInitiale?: string }) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="space-y-4">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Type de document" name="categorie" requis error={e.categorie}>
          <Select name="categorie" options={options(CATEGORIES_DOCUMENT)} defaultValue={valeurInitiale(state, "categorie", categorieInitiale ?? "PIECE_IDENTITE")} />
        </Field>
        <Field label="Libellé" name="libelle" error={e.libelle} hint="Ex. : CNI recto-verso, Avis 2025 sur revenus 2024">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", "")} />
        </Field>
        <Field label="Fichier(s)" name="fichier" requis error={e.fichier} hint="PDF, JPG, PNG, WEBP ou HEIC — 20 Mo max. par fichier">
          <Input name="fichier" type="file" accept={TYPES_ACCEPTES} multiple invalide={!!e.fichier} className="file:mr-3 file:rounded file:border-0 file:bg-navy-50 file:px-3 file:py-1 file:text-navy-800" />
        </Field>
      </div>
      <SubmitButton variante="accent" enCours="Import en cours…">Importer</SubmitButton>
    </form>
  );
}
