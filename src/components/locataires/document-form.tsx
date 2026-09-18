"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_DOCUMENT, options } from "@/lib/libelles";
import { TYPES_ACCEPTES } from "@/lib/storage-constantes";
import { televerser, type FichierTeleverse, type Preparateur } from "@/lib/envoi-direct";
import { Field, FormMessage, Input, Select, valeurInitiale } from "@/components/form";
import { ZoneFichier } from "@/components/zone-fichier";
import { Alerte, Button, Spinner } from "@/components/ui";

/**
 * Import d'un ou plusieurs justificatifs dans le dossier du locataire.
 * Les fichiers partent directement vers le stockage objet quand il est configuré, sinon par l'action serveur.
 */
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
  const [generation, setGeneration] = useState(0);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};
  const categorie = valeurInitiale(state, "categorie", categorieInitiale ?? "PIECE_IDENTITE");

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      setGeneration((g) => g + 1);
    }
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
        setEnvoi(fichiers.length > 1 ? `Envoi du fichier ${i + 1} sur ${fichiers.length} : ${fichiers[i].name}…` : `Envoi de ${fichiers[i].name}…`);
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

  const occupe = pending || !!envoi;

  return (
    <form ref={ref} onSubmit={soumettre} className="flex flex-col gap-3.5">
      <FormMessage state={state} />
      {erreurEnvoi && <Alerte ton="rouge">{erreurEnvoi}</Alerte>}
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
        <Field label="Catégorie" name="categorie" requis error={e.categorie}>
          <Select key={categorie} name="categorie" options={options(CATEGORIES_DOCUMENT)} defaultValue={categorie} invalide={!!e.categorie} />
        </Field>
        <Field label="Libellé" name="libelle" error={e.libelle} hint="Facultatif · ex. : CNI recto-verso, Avis 2025 sur revenus 2024">
          <Input name="libelle" defaultValue={valeurInitiale(state, "libelle", "")} invalide={!!e.libelle} />
        </Field>
      </div>
      <div>
        <ZoneFichier key={generation} name="fichier" accept={TYPES_ACCEPTES} multiple aide="PDF, JPG, PNG, WEBP ou HEIC · 20 Mo maximum par fichier" />
        {e.fichier && <p className="mt-1.5 text-xs text-red-600">{e.fichier}</p>}
        {envoi && (
          <div className="mt-2.5 flex items-center gap-2.5 text-[13px] text-slate-600" role="status">
            <Spinner className="border-navy-800/30 border-t-navy-800" />
            <span className="flex-1">{envoi}</span>
          </div>
        )}
      </div>
      <div>
        <Button type="submit" variante="accent" disabled={occupe}>
          {occupe && <Spinner className="border-navy-950/30 border-t-navy-950" />}
          {envoi ? "Envoi en cours…" : pending ? "Enregistrement…" : "Importer"}
        </Button>
      </div>
    </form>
  );
}
