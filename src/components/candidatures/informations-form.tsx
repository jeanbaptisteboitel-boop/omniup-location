"use client";

import { useActionState, useState } from "react";
import type { SituationCandidat } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { SITUATIONS } from "@/lib/candidatures";
import { montantPourSaisie } from "@/lib/montants";
import { toISODate } from "@/lib/dates";
import { Field, FormActions, FormMessage, Input, Select, SubmitButton, valeurInitiale } from "@/components/form";
import { ChampsAdresse } from "@/components/champs-adresse";

type Dossier = {
  personneMorale: boolean;
  civilite: string | null;
  nom: string;
  prenom: string | null;
  raisonSociale: string | null;
  dateNaissance: Date | null;
  lieuNaissance: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  complementAdresse: string | null;
  codePostal: string | null;
  ville: string | null;
  situation: SituationCandidat | null;
  employeur: string | null;
  poste: string | null;
  depuisLe: Date | null;
  finContratLe: Date | null;
  revenuMensuel: number | null;
  autresRevenus: number | null;
  detailAutresRevenus: string | null;
  chargesMensuelles: number | null;
};

const AVEC_EMPLOYEUR: SituationCandidat[] = ["CDI", "CDI_ESSAI", "CDD", "INTERIM", "FONCTIONNAIRE", "ALTERNANT"];
const AVEC_FIN_CONTRAT: SituationCandidat[] = ["CDD", "INTERIM", "ALTERNANT"];

/** Informations du dossier, saisies par le candidat ou par sa caution. */
export function InformationsForm({ action, dossier }: { action: (prev: FormState, fd: FormData) => Promise<FormState>; dossier: Dossier }) {
  const [state, formAction] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [situation, setSituation] = useState(valeurInitiale(state, "situation", dossier.situation));
  const sit = situation as SituationCandidat | "";
  const morale = dossier.personneMorale;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <FormMessage state={state} />

      <section className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold text-navy-900">{morale ? "L'organisme" : "Votre identité"}</h2>
        {morale ? (
          <Field label="Dénomination" name="raisonSociale" requis error={e.raisonSociale}>
            <Input name="raisonSociale" defaultValue={valeurInitiale(state, "raisonSociale", dossier.raisonSociale ?? dossier.nom)} invalide={!!e.raisonSociale} />
          </Field>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-[120px_1fr_1fr]">
              <Field label="Civilité" name="civilite" error={e.civilite}>
                <Select name="civilite" defaultValue={valeurInitiale(state, "civilite", dossier.civilite)} vide="—" options={[{ value: "M.", label: "M." }, { value: "Mme", label: "Mme" }]} />
              </Field>
              <Field label="Prénom" name="prenom" requis error={e.prenom}>
                <Input name="prenom" defaultValue={valeurInitiale(state, "prenom", dossier.prenom)} invalide={!!e.prenom} />
              </Field>
              <Field label="Nom" name="nom" requis error={e.nom}>
                <Input name="nom" defaultValue={valeurInitiale(state, "nom", dossier.nom)} invalide={!!e.nom} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Date de naissance" name="dateNaissance" error={e.dateNaissance}>
                <Input name="dateNaissance" type="date" defaultValue={valeurInitiale(state, "dateNaissance", toISODate(dossier.dateNaissance))} invalide={!!e.dateNaissance} />
              </Field>
              <Field label="Lieu de naissance" name="lieuNaissance" error={e.lieuNaissance}>
                <Input name="lieuNaissance" defaultValue={valeurInitiale(state, "lieuNaissance", dossier.lieuNaissance)} invalide={!!e.lieuNaissance} />
              </Field>
            </div>
          </>
        )}
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold text-navy-900">Vos coordonnées</h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label="Adresse email" name="email" requis error={e.email} hint="Le bailleur vous écrit à cette adresse.">
            <Input name="email" type="email" defaultValue={valeurInitiale(state, "email", dossier.email)} invalide={!!e.email} />
          </Field>
          <Field label="Téléphone" name="telephone" error={e.telephone}>
            <Input name="telephone" type="tel" defaultValue={valeurInitiale(state, "telephone", dossier.telephone)} invalide={!!e.telephone} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <ChampsAdresse state={state} initial={dossier} requis={false} />
        </div>
      </section>

      {!morale && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-sm font-bold text-navy-900">Votre situation professionnelle</h2>
          <Field label="Situation" name="situation" requis error={e.situation} hint="Elle détermine les justificatifs qui vous sont demandés.">
            <Select
              name="situation"
              value={situation}
              onChange={(ev) => setSituation(ev.target.value)}
              vide="Choisissez votre situation"
              invalide={!!e.situation}
              options={(Object.keys(SITUATIONS) as SituationCandidat[]).map((s) => ({ value: s, label: SITUATIONS[s] }))}
            />
          </Field>
          {AVEC_EMPLOYEUR.includes(sit as SituationCandidat) && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Employeur" name="employeur" error={e.employeur}>
                <Input name="employeur" defaultValue={valeurInitiale(state, "employeur", dossier.employeur)} invalide={!!e.employeur} />
              </Field>
              <Field label="Poste occupé" name="poste" error={e.poste}>
                <Input name="poste" defaultValue={valeurInitiale(state, "poste", dossier.poste)} invalide={!!e.poste} />
              </Field>
            </div>
          )}
          {sit === "INDEPENDANT" && (
            <Field label="Activité exercée" name="poste" error={e.poste} hint="Nature de l'activité et, le cas échéant, dénomination de la société.">
              <Input name="poste" defaultValue={valeurInitiale(state, "poste", dossier.poste)} invalide={!!e.poste} />
            </Field>
          )}
          {sit !== "" && sit !== "SANS_EMPLOI" && sit !== "RETRAITE" && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <Field label="Depuis le" name="depuisLe" error={e.depuisLe}>
                <Input name="depuisLe" type="date" defaultValue={valeurInitiale(state, "depuisLe", toISODate(dossier.depuisLe))} invalide={!!e.depuisLe} />
              </Field>
              {AVEC_FIN_CONTRAT.includes(sit as SituationCandidat) && (
                <Field label="Fin du contrat" name="finContratLe" error={e.finContratLe}>
                  <Input name="finContratLe" type="date" defaultValue={valeurInitiale(state, "finContratLe", toISODate(dossier.finContratLe))} invalide={!!e.finContratLe} />
                </Field>
              )}
            </div>
          )}
        </section>
      )}

      <section className="flex flex-col gap-3.5">
        <h2 className="text-sm font-bold text-navy-900">Vos ressources</h2>
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <Field label={morale ? "Ressources mensuelles (€)" : "Revenu mensuel net (€)"} name="revenuMensuel" requis error={e.revenuMensuel} hint={morale ? "Ressources mensuelles moyennes." : "Salaire, pension ou revenu d'activité net, avant impôt sur le revenu."}>
            <Input name="revenuMensuel" inputMode="decimal" defaultValue={valeurInitiale(state, "revenuMensuel", montantPourSaisie(dossier.revenuMensuel))} invalide={!!e.revenuMensuel} />
          </Field>
          <Field label="Autres revenus mensuels (€)" name="autresRevenus" error={e.autresRevenus} hint="Allocations, pensions, revenus fonciers…">
            <Input name="autresRevenus" inputMode="decimal" defaultValue={valeurInitiale(state, "autresRevenus", montantPourSaisie(dossier.autresRevenus))} invalide={!!e.autresRevenus} />
          </Field>
        </div>
        <Field label="Nature des autres revenus" name="detailAutresRevenus" error={e.detailAutresRevenus}>
          <Input name="detailAutresRevenus" defaultValue={valeurInitiale(state, "detailAutresRevenus", dossier.detailAutresRevenus)} placeholder="ex. Aide au logement, pension alimentaire" invalide={!!e.detailAutresRevenus} />
        </Field>
        <Field label="Charges mensuelles (€)" name="chargesMensuelles" error={e.chargesMensuelles} hint="Facultatif : crédits en cours, pension versée. Cette information n'est pas obligatoire.">
          <Input name="chargesMensuelles" inputMode="decimal" defaultValue={valeurInitiale(state, "chargesMensuelles", montantPourSaisie(dossier.chargesMensuelles))} invalide={!!e.chargesMensuelles} />
        </Field>
      </section>

      <FormActions>
        <SubmitButton>Enregistrer mes informations</SubmitButton>
      </FormActions>
    </form>
  );
}
