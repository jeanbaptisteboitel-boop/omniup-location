"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import type { CategorieModele, ModeleDocument } from "@prisma/client";
import type { FormState } from "@/lib/forms";
import { CATEGORIES_MODELE, options } from "@/lib/libelles";
import { VARIABLES_MODELE } from "@/lib/modeles";
import { Field, FormMessage, Input, Select, valeurInitiale } from "@/components/form";
import { Button, ButtonLink, Card, PageHeader, Spinner } from "@/components/ui";

/** Exemples de valeurs affichés à côté de chaque variable (la description reste disponible en info-bulle). */
const EXEMPLES: Record<string, string> = {
  "entite.nom": "SCI du Robec",
  "date.jour": "17 septembre 2026",
  "bailleur.nom": "Hervé Lemaître",
  "bailleur.qualite": "personne physique",
  "bailleur.representant": "représenté(e) par…",
  "bailleur.adresse": "18 rue des Chartreux…",
  "bailleur.email": "h.lemaitre@…",
  "bailleur.telephone": "06 12 45 78 90",
  "bailleur.siren": "812 345 678",
  "bailleur.iban": "FR76 1027…",
  "locataire.nomComplet": "Mme Camille Dupont",
  "locataire.identification": "Mme Camille Dupont, née le 14/03/1991, demeurant 4 allée des Tilleuls…",
  "locataire.dateNaissance": "14/03/1991",
  "locataire.adresse": "4 allée des Tilleuls…",
  "locataire.email": "camille.dupont@…",
  "locataire.telephone": "06 41 22 87 13",
  "lot.designation": "Appartement A1",
  "lot.type": "appartement",
  "lot.adresse": "4 allée des Tilleuls…",
  "lot.surface": "62",
  "lot.pieces": "3",
  "lot.etage": "1er",
  "lot.meuble": "non meublé",
  "lot.description": "Cuisine équipée, cave…",
  "bail.type": "Bail d'habitation…",
  "bail.dateDebut": "01/09/2024",
  "bail.dateFin": "31/08/2027",
  "bail.dureeMois": "36",
  "bail.loyerHC": "820,00 €",
  "bail.loyerHCLettres": "huit cent vingt euros",
  "bail.charges": "80,00 €",
  "bail.chargesRegime": "forfait",
  "bail.totalMensuel": "900,00 €",
  "bail.depotGarantie": "820,00 €",
  "bail.depotGarantieLettres": "huit cent vingt euros",
  "bail.jourEcheance": "5",
  "bail.irlTrimestre": "T2 2024",
  "bail.irlValeur": "145,17",
  "bail.dateSignature": "20/08/2024",
  "bail.motifMobilite": "Stage",
};

const GROUPES: { libelle: string; prefixe: string }[] = [
  { libelle: "Bailleur", prefixe: "bailleur." },
  { libelle: "Locataire", prefixe: "locataire." },
  { libelle: "Lot", prefixe: "lot." },
  { libelle: "Bail", prefixe: "bail." },
];

const VARIABLES_GROUPEES = [
  ...GROUPES.map((g) => ({ libelle: g.libelle, items: VARIABLES_MODELE.filter((v) => v.cle.startsWith(g.prefixe)) })),
  { libelle: "Divers", items: VARIABLES_MODELE.filter((v) => !GROUPES.some((g) => v.cle.startsWith(g.prefixe))) },
].filter((g) => g.items.length > 0);

/**
 * Éditeur de modèle : en-tête de page (Annuler / Enregistrer), carte éditeur (nom, catégorie, description, texte)
 * et panneau des variables, dont le clic insère la variable à la position du curseur.
 */
export function ModeleForm({
  action,
  initial,
  annulerHref,
  titre,
  badge,
  retour,
  flash,
  actionsSecondaires,
  nbDocuments = 0,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial: Partial<ModeleDocument>;
  annulerHref: string;
  /** Titre de la page (par défaut le nom du modèle). */
  titre?: string;
  badge?: ReactNode;
  retour: { href: string; libelle: string };
  /** Message flash rendu juste sous l'en-tête. */
  flash?: ReactNode;
  /** Autres actions (dupliquer, réinitialiser, supprimer) placées avant Annuler / Enregistrer. */
  actionsSecondaires?: ReactNode;
  nbDocuments?: number;
}) {
  const [state, formAction, enCours] = useActionState(action, null);
  const e = state?.errors ?? {};
  const [contenu, setContenu] = useState(() => initial.contenu ?? "");
  const [categorie, setCategorie] = useState<CategorieModele>(() => (valeurInitiale(state, "categorie", initial.categorie ?? "AUTRE") as CategorieModele) || "AUTRE");
  const zone = useRef<HTMLTextAreaElement>(null);
  /** Dernière sélection connue dans le texte (null tant que l'éditeur n'a pas reçu le focus : insertion à la fin). */
  const selection = useRef<{ debut: number; fin: number } | null>(null);

  function memoriserSelection() {
    const ta = zone.current;
    if (ta) selection.current = { debut: ta.selectionStart, fin: ta.selectionEnd };
  }

  function inserer(cle: string) {
    const jeton = `{{${cle}}}`;
    const ta = zone.current;
    const debut = selection.current?.debut ?? contenu.length;
    const fin = selection.current?.fin ?? debut;
    setContenu(contenu.slice(0, debut) + jeton + contenu.slice(fin));
    const position = debut + jeton.length;
    selection.current = { debut: position, fin: position };
    requestAnimationFrame(() => {
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(position, position);
    });
  }

  const sousTitre = [CATEGORIES_MODELE[categorie] ?? CATEGORIES_MODELE.AUTRE, nbDocuments > 0 ? `${nbDocuments} ${nbDocuments > 1 ? "documents générés" : "document généré"}` : null, "les variables entre doubles accolades sont remplacées à la génération."]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <PageHeader
        titre={titre ?? initial.nom ?? "Nouveau modèle"}
        badge={badge}
        sousTitre={sousTitre}
        retour={retour}
        actions={
          <>
            {actionsSecondaires}
            <ButtonLink href={annulerHref} variante="secondary">Annuler</ButtonLink>
            <Button type="submit" form="modele-form" disabled={enCours}>
              {enCours ? (
                <>
                  <Spinner />
                  Enregistrement…
                </>
              ) : (
                "Enregistrer"
              )}
            </Button>
          </>
        }
      />
      {flash}
      <form id="modele-form" action={formAction}>
        {state?.message && (
          <div className="mb-6">
            <FormMessage state={state} />
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] lg:items-start">
          <Card className="min-w-0">
            <div className="grid grid-cols-1 gap-4 border-b border-slate-100 px-6 py-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Field label="Nom du modèle" name="nom" requis error={e.nom}>
                <Input name="nom" defaultValue={valeurInitiale(state, "nom", initial.nom)} invalide={!!e.nom} />
              </Field>
              <Field label="Catégorie" name="categorie" requis error={e.categorie}>
                <Select name="categorie" options={options(CATEGORIES_MODELE)} value={categorie} onChange={(ev) => setCategorie(ev.target.value as CategorieModele)} invalide={!!e.categorie} />
              </Field>
              <Field label="Description" name="description" error={e.description} className="sm:col-span-2" hint="Quand utiliser ce modèle, textes applicables…">
                <Input name="description" defaultValue={valeurInitiale(state, "description", initial.description)} invalide={!!e.description} />
              </Field>
            </div>
            <label htmlFor="contenu" className="sr-only">
              Contenu du modèle
            </label>
            <textarea
              ref={zone}
              id="contenu"
              name="contenu"
              value={contenu}
              onChange={(ev) => setContenu(ev.target.value)}
              onSelect={memoriserSelection}
              onBlur={memoriserSelection}
              spellCheck={false}
              aria-invalid={!!e.contenu}
              className="block min-h-[560px] w-full resize-y border-0 bg-white px-6 py-5 text-sm leading-[1.7] text-slate-900 placeholder:text-slate-400 focus:outline-none"
              placeholder="Rédigez votre document et insérez les variables depuis le panneau de droite."
            />
            <div className="rounded-b-xl border-t border-slate-100 bg-white px-6 py-2.5 text-xs text-slate-500">
              {e.contenu ? <span className="text-red-600">{e.contenu}</span> : <>Titres : « # » et « ## » · listes : « - » · champs à compléter entre crochets, ex. [À COMPLÉTER : lieu].</>}
            </div>
          </Card>
          <Card className="lg:sticky lg:top-6">
            <div className="border-b border-slate-100 px-4 py-3.5">
              <h2 className="text-[15px] font-bold text-navy-900">Variables</h2>
              <p className="mt-0.5 text-xs text-slate-500">Cliquez pour insérer à la position du curseur.</p>
            </div>
            <div className="max-h-[600px] overflow-y-auto p-2">
              {VARIABLES_GROUPEES.map((g) => (
                <div key={g.libelle}>
                  <p className="mx-2 mb-1 mt-2 text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{g.libelle}</p>
                  {g.items.map((v) => (
                    <button
                      key={v.cle}
                      type="button"
                      onClick={() => inserer(v.cle)}
                      title={v.description}
                      className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-slate-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-cyan"
                    >
                      <code className="shrink-0 font-mono text-xs text-navy-800">{`{{${v.cle}}}`}</code>
                      <span className="truncate text-xs text-slate-500">{EXEMPLES[v.cle] ?? v.description}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </form>
    </>
  );
}
