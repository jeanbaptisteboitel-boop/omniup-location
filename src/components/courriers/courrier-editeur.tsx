"use client";

import { useActionState, useEffect, useState } from "react";
import type { TypeCourrier } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { TYPES_COURRIER, options } from "@/lib/libelles";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { Alerte, ButtonLink } from "@/components/ui";
import { IconeEtincelle } from "@/components/icones";

const OBJETS: Record<TypeCourrier, string> = {
  REVISION_LOYER: "Révision annuelle du loyer",
  RELANCE: "Relance pour loyer impayé",
  AUTRE: "",
};

export function CourrierEditeur({
  actionEnregistrer,
  actionGenerer,
  initial,
  revisionId,
  iaConfiguree,
  aDesRevisions,
  aDesImpayes,
  annulerHref,
  libelleEnregistrer = "Enregistrer le courrier",
}: {
  actionEnregistrer: (prev: FormState, fd: FormData) => Promise<FormState>;
  actionGenerer: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: { type: TypeCourrier; objet: string; contenu: string };
  revisionId?: number | null;
  iaConfiguree: boolean;
  aDesRevisions: boolean;
  aDesImpayes: boolean;
  annulerHref: string;
  libelleEnregistrer?: string;
}) {
  const [etat, enregistrer] = useActionState(actionEnregistrer, null);
  const [etatIA, generer] = useActionState(actionGenerer, null);
  const [type, setType] = useState<TypeCourrier>((valeurInitiale(etat, "type", initial.type) || "AUTRE") as TypeCourrier);
  const [objet, setObjet] = useState(valeurInitiale(etat, "objet", initial.objet || OBJETS[initial.type]));
  const [contenu, setContenu] = useState(valeurInitiale(etat, "contenu", initial.contenu));
  const e = etat?.errors ?? {};

  useEffect(() => {
    if (etatIA?.ok && etatIA.values?.texte) {
      setContenu(etatIA.values.texte);
      setObjet((o) => o || OBJETS[type]);
    }
  }, [etatIA, type]);

  const indisponible = (type === "REVISION_LOYER" && !aDesRevisions) || (type === "RELANCE" && !aDesImpayes);

  return (
    <div className="flex flex-col gap-5">
      <form action={generer} className="flex flex-col gap-3 rounded-lg border border-violet-200 bg-violet-50/40 p-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800"><IconeEtincelle taille={15} /></span>
          <p className="text-sm font-bold text-navy-900">Rédiger le courrier avec l'IA</p>
        </div>
        <FormMessage state={etatIA} />
        <input type="hidden" name="type" value={type} />
        {revisionId && <input type="hidden" name="revisionId" value={revisionId} />}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type de courrier" name="type_choix">
            <Select
              name="type_choix"
              options={options(TYPES_COURRIER)}
              value={type}
              onChange={(ev) => {
                const t = ev.target.value as TypeCourrier;
                setType(t);
                setObjet((o) => (o === "" || Object.values(OBJETS).includes(o) ? OBJETS[t] : o));
              }}
            />
          </Field>
          {type === "RELANCE" && (
            <Field label="Niveau" name="niveau">
              <Select name="niveau" options={[{ value: "simple", label: "Relance amiable" }, { value: "mise_en_demeure", label: "Mise en demeure (LRAR)" }]} defaultValue="simple" />
            </Field>
          )}
        </div>
        {type === "REVISION_LOYER" && !aDesRevisions && <Alerte ton="orange">Aucune révision de loyer n'est enregistrée : appliquez d'abord la révision depuis la fiche du bail.</Alerte>}
        {type === "RELANCE" && !aDesImpayes && <Alerte ton="orange">Aucune échéance en retard pour ce bail.</Alerte>}
        <Field label={type === "AUTRE" ? "Décrivez le courrier souhaité" : "Instructions complémentaires"} name="instructions" hint="Facultatif · ex. : rappeler l'obligation d'assurance, proposer un échéancier, ton ferme…">
          <Textarea name="instructions" rows={2} />
        </Field>
        {iaConfiguree ? (
          <div>
            <SubmitButton variante="secondary" taille="sm" enCours="Rédaction en cours…" disabled={indisponible}>Rédiger avec l'IA</SubmitButton>
          </div>
        ) : (
          <Alerte ton="orange">Assistant IA non configuré (ANTHROPIC_API_KEY) : rédigez le courrier ci-dessous.</Alerte>
        )}
      </form>

      <form action={enregistrer} className="flex flex-col gap-[18px]">
        <FormMessage state={etat} />
        <input type="hidden" name="type" value={type} />
        <Field label="Objet" name="objet" requis error={e.objet}>
          <Input name="objet" value={objet} onChange={(ev) => setObjet(ev.target.value)} invalide={!!e.objet} />
        </Field>
        <Field label="Texte du courrier" name="contenu" requis error={e.contenu} hint="Titres : « ## » ; listes : « - ». Le PDF ajoute automatiquement l'en-tête avec les coordonnées si le texte n'en comporte pas.">
          <Textarea name="contenu" rows={22} value={contenu} onChange={(ev) => setContenu(ev.target.value)} invalide={!!e.contenu} className="font-mono text-xs leading-relaxed" />
        </Field>
        <FormActions>
          <SubmitButton>{libelleEnregistrer}</SubmitButton>
          <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
        </FormActions>
      </form>
    </div>
  );
}
