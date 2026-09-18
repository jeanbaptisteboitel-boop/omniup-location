import type { StatutBail } from "@prisma/client";
import { Badge } from "@/components/ui";

/**
 * Statut d'un locataire déduit de ses baux :
 * en place = un bail signé ; candidat = aucun bail, ou seulement des brouillons / baux en signature ;
 * ancien = uniquement des baux terminés.
 */
export type StatutLocataire = "EN_PLACE" | "CANDIDAT" | "ANCIEN";

export const STATUTS_LOCATAIRE: Record<StatutLocataire, string> = {
  EN_PLACE: "En place",
  CANDIDAT: "Candidat",
  ANCIEN: "Ancien",
};

const TONS: Record<StatutLocataire, "vert" | "bleu" | "gris"> = { EN_PLACE: "vert", CANDIDAT: "bleu", ANCIEN: "gris" };

export function statutLocataire(baux: { statut: StatutBail }[]): StatutLocataire {
  if (baux.some((b) => b.statut === "SIGNE")) return "EN_PLACE";
  if (baux.some((b) => b.statut === "BROUILLON" || b.statut === "EN_SIGNATURE")) return "CANDIDAT";
  if (baux.some((b) => b.statut === "TERMINE")) return "ANCIEN";
  return "CANDIDAT";
}

/** Bail à mettre en avant : le bail signé, sinon le bail en préparation (brouillon ou en signature) le plus récent. */
export function bailCourant<T extends { statut: StatutBail }>(baux: T[]): T | undefined {
  return baux.find((b) => b.statut === "SIGNE") ?? baux.find((b) => b.statut === "EN_SIGNATURE" || b.statut === "BROUILLON");
}

export function initiales(p: { prenom: string; nom: string }): string {
  return `${p.prenom.trim().charAt(0)}${p.nom.trim().charAt(0)}`.toUpperCase();
}

export function BadgeStatutLocataire({ statut }: { statut: StatutLocataire }) {
  return <Badge ton={TONS[statut]}>{STATUTS_LOCATAIRE[statut]}</Badge>;
}

/** Avatar rond aux initiales du locataire (listes, en-têtes). */
export function Avatar({ p, className = "" }: { p: { prenom: string; nom: string }; className?: string }) {
  return (
    <span aria-hidden="true" className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy-50 text-xs font-bold text-navy-800 ${className}`}>
      {initiales(p)}
    </span>
  );
}
