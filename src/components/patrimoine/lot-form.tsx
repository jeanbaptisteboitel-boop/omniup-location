"use client";

import { useActionState, useState } from "react";
import type { Lot } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { options, TYPES_LOT } from "@/lib/libelles";
import { montantPourSaisie } from "@/lib/montants";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export type ImmeubleOption = { id: number; nom: string; adresse: string; complementAdresse: string | null; codePostal: string; ville: string; bailleurId: number | null };

export function LotForm({
  action,
  initial,
  bailleurs,
  immeubles,
  annulerHref,
  libelleEnvoi = "Enregistrer",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<Lot>;
  bailleurs: { id: number; nom: string }[];
  immeubles: ImmeubleOption[];
  annulerHref: string;
  libelleEnvoi?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [adresse, setAdresse] = useState({
    adresse: valeurInitiale(state, "adresse", initial.adresse),
    complementAdresse: valeurInitiale(state, "complementAdresse", initial.complementAdresse),
    codePostal: valeurInitiale(state, "codePostal", initial.codePostal),
    ville: valeurInitiale(state, "ville", initial.ville),
  });
  const [bailleurId, setBailleurId] = useState(valeurInitiale(state, "bailleurId", initial.bailleurId));
  const [type, setType] = useState(valeurInitiale(state, "type", initial.type ?? "APPARTEMENT"));

  function choisirImmeuble(id: string) {
    const im = immeubles.find((i) => String(i.id) === id);
    if (!im) return;
    setAdresse({ adresse: im.adresse, complementAdresse: im.complementAdresse ?? "", codePostal: im.codePostal, ville: im.ville });
    if (im.bailleurId && !bailleurId) setBailleurId(String(im.bailleurId));
  }

  return (
    <form action={formAction} className="flex flex-col gap-[18px]">
      <FormMessage state={state} />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
        <Field label="Désignation" name="nom" requis error={e.nom}>
          <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} placeholder="ex. Appartement A3" />
        </Field>
        <Field label="Immeuble" name="immeubleId" error={e.immeubleId} hint="Facultatif : regroupe les lots d'un même immeuble et pré-remplit l'adresse.">
          <Select
            name="immeubleId"
            vide="Aucun immeuble"
            options={immeubles.map((i) => ({ value: String(i.id), label: `${i.nom} — ${i.codePostal} ${i.ville}` }))}
            defaultValue={valeurInitiale(state, "immeubleId", initial.immeubleId)}
            onChange={(ev) => choisirImmeuble(ev.target.value)}
          />
        </Field>
        <Field label="Type" name="type" requis error={e.type}>
          <Select name="type" options={options(TYPES_LOT)} value={type} onChange={(ev) => setType(ev.target.value)} />
        </Field>
        <div className="flex items-end pb-2.5">
          <Checkbox name="meuble" label="Logement meublé" hint="Détermine le type de bail proposé." defaultChecked={state?.values ? state.values.meuble === "on" : !!initial.meuble} />
        </div>
        <Field label="Adresse" name="adresse" requis error={e.adresse} className="sm:col-span-2">
          <Input name="adresse" value={adresse.adresse} onChange={(ev) => setAdresse({ ...adresse, adresse: ev.target.value })} invalide={!!e.adresse} placeholder="ex. 4 allée des Tilleuls" autoComplete="street-address" />
        </Field>
        <Field label="Complément d'adresse" name="complementAdresse" error={e.complementAdresse} className="sm:col-span-2">
          <Input name="complementAdresse" value={adresse.complementAdresse} onChange={(ev) => setAdresse({ ...adresse, complementAdresse: ev.target.value })} placeholder="Bâtiment, étage, porte…" />
        </Field>
        <Field label="Code postal" name="codePostal" requis error={e.codePostal}>
          <Input name="codePostal" inputMode="numeric" value={adresse.codePostal} onChange={(ev) => setAdresse({ ...adresse, codePostal: ev.target.value })} invalide={!!e.codePostal} placeholder="ex. 76100" />
        </Field>
        <Field label="Ville" name="ville" requis error={e.ville}>
          <Input name="ville" value={adresse.ville} onChange={(ev) => setAdresse({ ...adresse, ville: ev.target.value })} invalide={!!e.ville} placeholder="ex. Rouen" />
        </Field>
        <Field label="Surface (m²)" name="surface" error={e.surface}>
          <Input name="surface" inputMode="decimal" defaultValue={valeurInitiale(state, "surface", initial.surface)} invalide={!!e.surface} placeholder="ex. 45" />
        </Field>
        <Field label="Nombre de pièces" name="nbPieces" error={e.nbPieces}>
          <Input name="nbPieces" inputMode="numeric" defaultValue={valeurInitiale(state, "nbPieces", initial.nbPieces)} invalide={!!e.nbPieces} placeholder="ex. 2" />
        </Field>
        {type === "APPARTEMENT" && (
          <>
            <Field label="Étage" name="etage" error={e.etage}>
              <Input name="etage" defaultValue={valeurInitiale(state, "etage", initial.etage)} placeholder="ex. RDC, 1er, 2e" />
            </Field>
            <div className="hidden sm:block" />
          </>
        )}
        <Field label="Loyer hors charges (€)" name="loyerIndicatif" error={e.loyerIndicatif} hint="Loyer de référence proposé lors de la création d'un bail.">
          <Input name="loyerIndicatif" inputMode="decimal" defaultValue={valeurInitiale(state, "loyerIndicatif", montantPourSaisie(initial.loyerIndicatif))} invalide={!!e.loyerIndicatif} placeholder="ex. 620,00" />
        </Field>
        <Field label="Charges mensuelles (€)" name="chargesIndicatives" error={e.chargesIndicatives} hint="Provision pour charges proposée lors de la création d'un bail.">
          <Input name="chargesIndicatives" inputMode="decimal" defaultValue={valeurInitiale(state, "chargesIndicatives", montantPourSaisie(initial.chargesIndicatives))} invalide={!!e.chargesIndicatives} placeholder="ex. 60,00" />
        </Field>
        <Field label="Bailleur propriétaire" name="bailleurId" error={e.bailleurId} hint="Apparaît sur les avis d'échéance et les quittances." className="sm:col-span-2">
          <Select name="bailleurId" vide="À définir" options={bailleurs.map((b) => ({ value: String(b.id), label: b.nom }))} value={bailleurId} onChange={(ev) => setBailleurId(ev.target.value)} />
        </Field>
        <Field label="Description" name="description" error={e.description} className="sm:col-span-2">
          <Textarea name="description" rows={3} defaultValue={valeurInitiale(state, "description", initial.description)} placeholder="Équipements, parking, cave, DPE…" />
        </Field>
      </div>
      <FormActions>
        <SubmitButton>{libelleEnvoi}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
