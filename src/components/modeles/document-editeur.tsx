"use client";

import { useActionState, useEffect, useState } from "react";
import type { CategorieModele } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_MODELE, options } from "@/lib/libelles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte } from "@/components/ui";

export function DocumentEditeur({
  actionEnregistrer,
  actionAdapter,
  initial,
  baux,
  iaConfiguree,
}: {
  actionEnregistrer: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionAdapter: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: { titre: string; categorie: CategorieModele; bailId: number | null; contenu: string };
  baux: { id: number; libelle: string }[];
  iaConfiguree: boolean;
}) {
  const [etat, enregistrer] = useActionState(actionEnregistrer, null);
  const [etatIA, adapter] = useActionState(actionAdapter, null);
  const [contenu, setContenu] = useState(initial.contenu);
  const e = etat?.errors ?? {};

  useEffect(() => {
    if (etatIA?.ok && etatIA.values?.texte) setContenu(etatIA.values.texte);
  }, [etatIA]);

  const aCompleter = (contenu.match(/\[À COMPLÉTER/g) ?? []).length;

  return (
    <div className="space-y-6">
      <form action={adapter} className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/60 p-4">
        <p className="text-sm font-semibold text-navy-900">Assistant IA — adapter ou compléter le document</p>
        <FormMessage state={etatIA} />
        <input type="hidden" name="contenu" value={contenu} />
        <Field label="Instructions" name="instructions" hint="Ex. : compléter les champs manquants avec les informations du bail, ajouter une clause sur les animaux, reformuler l'article 3 de façon plus simple…">
          <Textarea name="instructions" rows={2} />
        </Field>
        {iaConfiguree ? <SubmitButton variante="accent" enCours="Rédaction en cours…">Adapter avec l'IA</SubmitButton> : <Alerte ton="orange">Assistant IA non configuré (ANTHROPIC_API_KEY).</Alerte>}
      </form>

      <form action={enregistrer} className="space-y-4">
        <FormMessage state={etat} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Titre" name="titre" requis error={e.titre} className="sm:col-span-2">
            <Input name="titre" defaultValue={valeurInitiale(etat, "titre", initial.titre)} invalide={!!e.titre} />
          </Field>
          <Field label="Catégorie" name="categorie" error={e.categorie}>
            <Select name="categorie" options={options(CATEGORIES_MODELE)} defaultValue={valeurInitiale(etat, "categorie", initial.categorie)} />
          </Field>
          <Field label="Bail rattaché" name="bailId" error={e.bailId} className="sm:col-span-3" hint="Permet l'envoi au locataire par email et l'affichage sur la fiche du bail">
            <Select name="bailId" vide="— Aucun —" options={baux.map((b) => ({ value: String(b.id), label: b.libelle }))} defaultValue={valeurInitiale(etat, "bailId", initial.bailId)} />
          </Field>
        </div>
        <Field label="Texte du document" name="contenu" requis error={e.contenu} hint={aCompleter ? `${aCompleter} champ(s) entre crochets restent à compléter.` : "Aucun champ à compléter."}>
          <Textarea name="contenu" rows={30} value={contenu} onChange={(ev) => setContenu(ev.target.value)} invalide={!!e.contenu} className="font-mono text-xs leading-relaxed" />
        </Field>
        <FormActions>
          <SubmitButton>Enregistrer</SubmitButton>
        </FormActions>
      </form>
    </div>
  );
}
