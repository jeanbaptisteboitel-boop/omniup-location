"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { CategorieModele } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_MODELE, options } from "@/lib/libelles";
import { Field, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, Card, Spinner } from "@/components/ui";
import { IconeEtincelle } from "@/components/icones";

const SUGGESTIONS = ["Ton plus ferme", "Ajouter une clause de sous-location", "Raccourcir"];

function BoutonIA({ desactive }: { desactive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || desactive}
      className="inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-violet-800 text-sm font-semibold text-white transition-colors hover:bg-violet-900 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? (
        <>
          <Spinner />
          Rédaction en cours…
        </>
      ) : (
        "Adapter avec l'IA"
      )}
    </button>
  );
}

/**
 * Éditeur d'un document généré : carte éditeur (titre, catégorie, bail, texte) à gauche ;
 * carte « Adapter avec l'IA » et informations à droite. Le bloc d'envoi par email est placé sous l'éditeur.
 */
export function DocumentEditeur({
  actionEnregistrer,
  actionAdapter,
  initial,
  baux,
  iaConfiguree,
  informations,
  envoi,
}: {
  actionEnregistrer: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionAdapter: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: { titre: string; categorie: CategorieModele; bailId: number | null; contenu: string };
  baux: { id: number; libelle: string }[];
  iaConfiguree: boolean;
  /** Carte « Informations » (bail, destinataire, date). */
  informations?: ReactNode;
  /** Bloc d'envoi par email (ancre #envoi). */
  envoi?: ReactNode;
}) {
  const [etat, enregistrer] = useActionState(actionEnregistrer, null);
  const [etatIA, adapter] = useActionState(actionAdapter, null);
  const [contenu, setContenu] = useState(initial.contenu);
  const [consigne, setConsigne] = useState("");
  const e = etat?.errors ?? {};

  useEffect(() => {
    if (etatIA?.ok && etatIA.values?.texte) setContenu(etatIA.values.texte);
  }, [etatIA]);

  const aCompleter = (contenu.match(/\[À COMPLÉTER/g) ?? []).length;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:items-start">
      <div className="min-w-0 space-y-6">
        <Card className="min-w-0">
          <form action={enregistrer}>
            {etat?.message && (
              <div className="px-6 pt-4">
                <FormMessage state={etat} />
              </div>
            )}
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-4 sm:grid-cols-2">
              <Field label="Titre" name="titre" requis error={e.titre} className="sm:col-span-2">
                <Input name="titre" defaultValue={valeurInitiale(etat, "titre", initial.titre)} invalide={!!e.titre} />
              </Field>
              <Field label="Catégorie" name="categorie" error={e.categorie}>
                <Select name="categorie" options={options(CATEGORIES_MODELE)} defaultValue={valeurInitiale(etat, "categorie", initial.categorie)} invalide={!!e.categorie} />
              </Field>
              <Field label="Bail rattaché" name="bailId" error={e.bailId} hint="Permet l'envoi au locataire par email et l'affichage sur la fiche du bail.">
                <Select name="bailId" vide="— Aucun —" options={baux.map((b) => ({ value: String(b.id), label: b.libelle }))} defaultValue={valeurInitiale(etat, "bailId", initial.bailId)} invalide={!!e.bailId} />
              </Field>
            </div>
            <label htmlFor="contenu" className="sr-only">
              Texte du document
            </label>
            <textarea
              id="contenu"
              name="contenu"
              value={contenu}
              onChange={(ev) => setContenu(ev.target.value)}
              spellCheck={false}
              aria-invalid={!!e.contenu}
              className="block min-h-[600px] w-full resize-y border-0 bg-white px-5 py-6 text-sm leading-[1.75] text-slate-900 focus:outline-none sm:px-10 sm:py-8"
            />
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-b-xl border-t border-slate-100 bg-white px-6 py-4">
              <SubmitButton>Enregistrer</SubmitButton>
              <p className={`text-xs ${e.contenu ? "text-red-600" : aCompleter ? "text-amber-700" : "text-slate-500"}`}>
                {e.contenu ? e.contenu : aCompleter ? `${aCompleter} ${aCompleter > 1 ? "champs entre crochets restent" : "champ entre crochets reste"} à compléter.` : "Aucun champ à compléter."}
              </p>
            </div>
          </form>
        </Card>
        {envoi}
      </div>
      <div className="space-y-6">
        <form action={adapter} className="rounded-xl border border-violet-200 bg-white shadow-card">
          <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-3.5">
            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
              <IconeEtincelle taille={16} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-navy-900">Adapter avec l'IA</h2>
              <p className="text-xs text-slate-500">Reformule ou complète le document selon votre consigne.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 px-4 py-3.5">
            <FormMessage state={etatIA} />
            <input type="hidden" name="contenu" value={contenu} />
            <label htmlFor="instructions" className="sr-only">
              Consigne
            </label>
            <Textarea
              name="instructions"
              rows={3}
              value={consigne}
              onChange={(ev) => setConsigne(ev.target.value)}
              disabled={!iaConfiguree}
              placeholder="ex. Ajoute une clause d'interdiction de sous-location et rends le ton plus courtois."
            />
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setConsigne(s)}
                  disabled={!iaConfiguree}
                  className="h-7 cursor-pointer rounded-full border border-slate-200 bg-white px-2.5 text-xs text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            {iaConfiguree ? <BoutonIA desactive={!iaConfiguree} /> : <Alerte ton="orange">Assistant IA non configuré (ANTHROPIC_API_KEY).</Alerte>}
          </div>
        </form>
        {informations}
      </div>
    </div>
  );
}
