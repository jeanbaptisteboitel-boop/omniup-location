"use client";

import { useActionState, useState } from "react";
import type { TypeGarantie } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { TYPES_GARANTIE } from "@/lib/candidatures";
import { montantPourSaisie } from "@/lib/montants";
import { toISODate } from "@/lib/dates";
import { Checkbox, Field, FormActions, FormMessage, Input, Select, SubmitButton, Textarea, valeurInitiale } from "@/components/form";
import { ButtonLink } from "@/components/ui";

export type LotOption = { id: number; nom: string; loyerIndicatif: number | null; chargesIndicatives: number | null };

type Initial = {
  lotId: number | null;
  loyerAnnonce: number | null;
  chargesAnnonce: number | null;
  dateSouhaitee: Date | null;
  typeGarantie: TypeGarantie | null;
  assuranceLoyersImpayes: boolean;
  notes: string | null;
};

const VIDE: Initial = { lotId: null, loyerAnnonce: null, chargesAnnonce: null, dateSouhaitee: null, typeGarantie: null, assuranceLoyersImpayes: false, notes: null };

/** Candidature côté gestionnaire : logement visé, loyer annoncé, garantie attendue et, à la création, le candidat. */
export function CandidatureForm({
  action,
  lots,
  initial = VIDE,
  creation = false,
  annulerHref = "/candidatures",
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lots: LotOption[];
  initial?: Initial;
  creation?: boolean;
  annulerHref?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [lotId, setLotId] = useState(valeurInitiale(state, "lotId", initial.lotId));
  const [loyer, setLoyer] = useState(valeurInitiale(state, "loyerAnnonce", montantPourSaisie(initial.loyerAnnonce)));
  const [charges, setCharges] = useState(valeurInitiale(state, "chargesAnnonce", montantPourSaisie(initial.chargesAnnonce)));

  /** Reprend le loyer indicatif du lot choisi tant que rien n'a été saisi à la main. */
  function choisirLot(valeur: string) {
    setLotId(valeur);
    const lot = lots.find((l) => String(l.id) === valeur);
    if (!lot) return;
    if (loyer.trim() === "" && lot.loyerIndicatif !== null) setLoyer(montantPourSaisie(lot.loyerIndicatif));
    if (charges.trim() === "" && lot.chargesIndicatives !== null) setCharges(montantPourSaisie(lot.chargesIndicatives));
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormMessage state={state} />

      <section className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold text-navy-900">Le logement proposé</h2>
        <Field label="Logement" name="lotId" error={e.lotId} hint="Facultatif : une candidature peut être ouverte avant d'affecter un lot.">
          <Select name="lotId" value={lotId} onChange={(ev) => choisirLot(ev.target.value)} vide="À préciser plus tard" invalide={!!e.lotId} options={lots.map((l) => ({ value: String(l.id), label: l.nom }))} />
        </Field>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <Field label="Loyer hors charges (€)" name="loyerAnnonce" error={e.loyerAnnonce}>
            <Input name="loyerAnnonce" inputMode="decimal" value={loyer} onChange={(ev) => setLoyer(ev.target.value)} invalide={!!e.loyerAnnonce} />
          </Field>
          <Field label="Charges (€)" name="chargesAnnonce" error={e.chargesAnnonce}>
            <Input name="chargesAnnonce" inputMode="decimal" value={charges} onChange={(ev) => setCharges(ev.target.value)} invalide={!!e.chargesAnnonce} />
          </Field>
          <Field label="Entrée souhaitée" name="dateSouhaitee" error={e.dateSouhaitee}>
            <Input name="dateSouhaitee" type="date" defaultValue={valeurInitiale(state, "dateSouhaitee", toISODate(initial.dateSouhaitee))} invalide={!!e.dateSouhaitee} />
          </Field>
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold text-navy-900">La garantie attendue</h2>
        <Field label="Garantie demandée au candidat" name="typeGarantie" error={e.typeGarantie} hint="Indiquée au candidat dans son espace.">
          <Select
            name="typeGarantie"
            defaultValue={valeurInitiale(state, "typeGarantie", initial.typeGarantie)}
            vide="Non précisée"
            invalide={!!e.typeGarantie}
            options={(Object.keys(TYPES_GARANTIE) as TypeGarantie[]).map((t) => ({ value: t, label: TYPES_GARANTIE[t] }))}
          />
        </Field>
        <Checkbox
          name="assuranceLoyersImpayes"
          label="Le bailleur a souscrit une assurance contre les loyers impayés"
          hint="Dans ce cas, aucun cautionnement ne peut être exigé en plus, sauf si le locataire est étudiant ou apprenti (article 22-1 de la loi du 6 juillet 1989)."
          defaultChecked={state?.values ? state.values.assuranceLoyersImpayes === "on" : initial.assuranceLoyersImpayes}
        />
      </section>

      {creation && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-sm font-bold text-navy-900">Le candidat</h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[120px_1fr_1fr]">
            <Field label="Civilité" name="civilite" error={e.civilite}>
              <Select name="civilite" defaultValue={valeurInitiale(state, "civilite", "")} vide="—" options={[{ value: "M.", label: "M." }, { value: "Mme", label: "Mme" }]} />
            </Field>
            <Field label="Prénom" name="prenom" requis error={e.prenom}>
              <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", "")} invalide={!!e.prenom} />
            </Field>
            <Field label="Nom" name="nom" requis error={e.nom}>
              <Input name="nom" defaultValue={valeurInitiale(state, "nom", "")} invalide={!!e.nom} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <Field label="Adresse email" name="email" requis error={e.email} hint="Son lien d'accès personnel y sera envoyé.">
              <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", "")} invalide={!!e.email} />
            </Field>
            <Field label="Téléphone" name="telephone" error={e.telephone}>
              <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", "")} invalide={!!e.telephone} />
            </Field>
          </div>
        </section>
      )}

      <Field label="Notes internes" name="notes" error={e.notes} hint="Visibles du gestionnaire uniquement.">
        <Textarea name="notes" rows={3} defaultValue={valeurInitiale(state, "notes", initial.notes)} />
      </Field>

      <FormActions>
        <SubmitButton>{creation ? "Ouvrir la candidature" : "Enregistrer"}</SubmitButton>
        <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
      </FormActions>
    </form>
  );
}
