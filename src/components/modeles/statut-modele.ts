import type { ModeleDocument } from "@prisma/client";
import { modeleDefautParCode } from "@/lib/modeles-defaut";

export type StatutModele = {
  /** Modèle créé par l'utilisateur, ou modèle fourni par défaut dont le texte a été modifié. */
  perso: boolean;
  /** Modèle fourni par défaut modifié : peut reprendre sa version d'origine. */
  reinitialisable: boolean;
};

/** Statut affiché dans la bibliothèque : « Par défaut » (fourni, intact) ou « Personnalisé ». */
export function statutModele(m: Pick<ModeleDocument, "code" | "nom" | "categorie" | "description" | "contenu" | "parDefaut">): StatutModele {
  if (!m.parDefaut) return { perso: true, reinitialisable: false };
  const defaut = m.code ? modeleDefautParCode(m.code) : undefined;
  if (!defaut) return { perso: false, reinitialisable: false };
  const modifie = defaut.nom !== m.nom || defaut.categorie !== m.categorie || (defaut.description ?? "") !== (m.description ?? "") || defaut.contenu !== m.contenu;
  return { perso: modifie, reinitialisable: modifie };
}

/** Texte sans accents ni majuscules, pour la recherche. */
export function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
