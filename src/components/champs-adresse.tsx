"use client";

import { Field, Input, valeurInitiale } from "./form";
import type { FormState } from "@/lib/forms";

export type Adresse = {
  adresse?: string | null;
  complementAdresse?: string | null;
  codePostal?: string | null;
  ville?: string | null;
};

/** Bloc adresse réutilisé par les formulaires (mode non contrôlé). */
export function ChampsAdresse({ state, initial, requis = true }: { state: FormState; initial: Adresse; requis?: boolean }) {
  const e = state?.errors ?? {};
  return (
    <>
      <Field label="Adresse" name="adresse" requis={requis} error={e.adresse} className="sm:col-span-2">
        <Input name="adresse" defaultValue={valeurInitiale(state, "adresse", initial.adresse)} invalide={!!e.adresse} autoComplete="street-address" />
      </Field>
      <Field label="Complément d'adresse" name="complementAdresse" error={e.complementAdresse} className="sm:col-span-2">
        <Input name="complementAdresse" defaultValue={valeurInitiale(state, "complementAdresse", initial.complementAdresse)} placeholder="Bâtiment, étage, appartement…" />
      </Field>
      <Field label="Code postal" name="codePostal" requis={requis} error={e.codePostal}>
        <Input name="codePostal" inputMode="numeric" defaultValue={valeurInitiale(state, "codePostal", initial.codePostal)} invalide={!!e.codePostal} />
      </Field>
      <Field label="Ville" name="ville" requis={requis} error={e.ville}>
        <Input name="ville" defaultValue={valeurInitiale(state, "ville", initial.ville)} invalide={!!e.ville} />
      </Field>
    </>
  );
}
