"use client";

import { useActionState, useEffect, useState } from "react";
import type { FormState } from "@/lib/forms";
import { Field, FormActions, FormMessage, SubmitButton, Textarea } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";
import { IconeEtincelle } from "@/components/icones";

export function ContratEditeur({
  actionEnregistrer,
  actionGenerer,
  texteInitial,
  pdfHref,
  iaConfiguree,
}: {
  actionEnregistrer: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionGenerer: (prev: FormState, fd: FormData) => Promise<FormState>;
  texteInitial: string;
  pdfHref: string;
  iaConfiguree: boolean;
}) {
  const [etatSauvegarde, enregistrer] = useActionState(actionEnregistrer, null);
  const [etatIA, generer, generationEnCours] = useActionState(actionGenerer, null);
  const [texte, setTexte] = useState(texteInitial);
  const [enregistre, setEnregistre] = useState(texteInitial);

  useEffect(() => {
    if (etatIA?.ok && etatIA.values?.texte) setTexte(etatIA.values.texte);
  }, [etatIA]);

  useEffect(() => {
    if (etatSauvegarde?.ok) setEnregistre(texte);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etatSauvegarde]);

  return (
    <div className="flex flex-col gap-5">
      <form action={generer} className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800"><IconeEtincelle taille={15} /></span>
          <p className="text-sm font-bold text-navy-900">Rédiger le contrat avec l'IA</p>
        </div>
        {iaConfiguree ? (
          <>
            <FormMessage state={etatIA} />
            <Field label="Instructions complémentaires" name="instructions" hint="Facultatif · ex. : ajouter une clause interdisant la sous-location, préciser que le jardin est inclus, colocation avec clause de solidarité…">
              <Textarea name="instructions" rows={2} />
            </Field>
            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton variante="secondary" taille="sm" enCours="Rédaction en cours (une à deux minutes)…">
                {texte ? "Rédiger une nouvelle version avec l'IA" : "Rédiger le contrat avec l'IA"}
              </SubmitButton>
              {generationEnCours && <span className="text-xs text-slate-500">Le contrat complet est rédigé à partir des informations du bail, du lot, du bailleur et du locataire.</span>}
            </div>
          </>
        ) : (
          <Alerte ton="orange">L'assistant IA n'est pas configuré. Renseignez la clé ANTHROPIC_API_KEY dans le fichier .env (voir Paramètres) pour rédiger automatiquement les contrats.</Alerte>
        )}
      </form>

      <form action={enregistrer} className="flex flex-col gap-3.5">
        <FormMessage state={etatSauvegarde} />
        <Textarea
          name="texteContrat"
          aria-label="Texte du contrat"
          rows={30}
          value={texte}
          onChange={(ev) => setTexte(ev.target.value)}
          className="font-mono text-xs leading-relaxed"
          placeholder="Le texte du contrat. Rédigez-le, collez-le depuis votre modèle, ou générez-le. Titres : lignes commençant par « # » ou « ## » ; listes : lignes commençant par « - »."
        />
        <FormActions>
          <SubmitButton>Enregistrer le contrat</SubmitButton>
          {enregistre && (
            <ButtonLink href={pdfHref} variante="secondary" target="_blank">
              Télécharger le PDF{texte !== enregistre ? " (version enregistrée)" : ""}
            </ButtonLink>
          )}
          {texte !== enregistre && <span className="text-xs font-semibold text-amber-700">Modifications non enregistrées.</span>}
        </FormActions>
      </form>
    </div>
  );
}
