"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_DOCUMENT, options } from "@/lib/libelles";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type FichierTeleverse, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormMessage, Input, Select, valeurInitiale } from "@/components/form";
import { Alerte, Button } from "@/components/ui";

export function DocumentForm({
  action,
  preparer,
  categorieInitiale,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  preparer: Preparateur;
  categorieInitiale?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<string | null>(null);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) ref.current?.reset();
  }, [state]);

  async function soumettre(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    setErreurEnvoi(null);
    const fd = new FormData(ev.currentTarget);
    const fichiers = fd.getAll("fichier").filter((f): f is File => f instanceof File && f.size > 0);
    try {
      const televerses: FichierTeleverse[] = [];
      let modeServeur = fichiers.length === 0;
      for (let i = 0; i < fichiers.length && !modeServeur; i++) {
        setEnvoi(`Envoi du fichier ${i + 1} sur ${fichiers.length}…`);
        const r = await televerser(fichiers[i], preparer);
        if (r.mode === "serveur") modeServeur = true;
        else televerses.push(r.fichier);
      }
      if (!modeServeur) {
        fd.delete("fichier");
        fd.set("fichiers", JSON.stringify(televerses));
      }
      startTransition(() => formAction(fd));
    } catch (err) {
      setErreurEnvoi(err instanceof Error ? err.message : "Échec de l'envoi du fichier.");
    } finally {
      setEnvoi(null);
    }
  }

  return (
    <form ref={ref} onSubmit={soumettre} className="space-y-4">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
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
      <div className="flex items-center gap-3">
        <Button type="submit" variante="accent" disabled={pending || !!envoi}>
          {envoi ?? (pending ? "Enregistrement…" : "Importer")}
        </Button>
      </div>
    </form>
  );
}
