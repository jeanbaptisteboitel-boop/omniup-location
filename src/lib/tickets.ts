import type { StatutTicket, TypeTicket } from "@prisma/client";

/**
 * Tickets d'assistance ouverts depuis l'application : demande d'aide, signalement d'un dysfonctionnement
 * ou proposition d'amélioration. Ils sont conservés dans la base et transmis par email à l'assistance
 * lorsqu'une adresse est configurée (SUPPORT_EMAIL, à défaut ALERTES_EMAIL).
 */

export const TYPES_TICKET: Record<TypeTicket, string> = {
  AIDE: "Demande d'aide",
  BUG: "Signaler un problème",
  FONCTIONNALITE: "Proposer une amélioration",
};

export const AIDES_TYPE_TICKET: Record<TypeTicket, string> = {
  AIDE: "Une question sur l'utilisation du logiciel",
  BUG: "Quelque chose ne fonctionne pas comme prévu",
  FONCTIONNALITE: "Une idée pour aller plus vite ou plus loin",
};

export const STATUTS_TICKET: Record<StatutTicket, string> = {
  NOUVEAU: "Nouveau",
  EN_COURS: "En cours",
  RESOLU: "Résolu",
  FERME: "Fermé",
};

export const TONS_TICKET: Record<StatutTicket, "bleu" | "orange" | "vert" | "gris"> = {
  NOUVEAU: "bleu",
  EN_COURS: "orange",
  RESOLU: "vert",
  FERME: "gris",
};

export const TONS_TYPE_TICKET: Record<TypeTicket, "cyan" | "rouge" | "violet"> = {
  AIDE: "cyan",
  BUG: "rouge",
  FONCTIONNALITE: "violet",
};

/** Un ticket est ouvert tant qu'il n'est ni résolu ni fermé. */
export function ticketOuvert(t: { statut: StatutTicket }): boolean {
  return t.statut === "NOUVEAU" || t.statut === "EN_COURS";
}

export function numeroTicket(id: number): string {
  return `T-${String(id).padStart(5, "0")}`;
}

/** Adresse de l'assistance : SUPPORT_EMAIL, à défaut l'adresse des alertes. */
export function adresseAssistance(): string | null {
  // Une variable renseignée mais vide (fichier .env) ne doit pas masquer l'adresse de repli.
  const a = (process.env.SUPPORT_EMAIL || "").trim() || (process.env.ALERTES_EMAIL || "").trim();
  return a || null;
}

const NAVIGATEURS: [RegExp, string][] = [
  [/Edg\/(\d+)/, "Edge"],
  [/OPR\/(\d+)/, "Opera"],
  [/Firefox\/(\d+)/, "Firefox"],
  [/Chrome\/(\d+)/, "Chrome"],
  [/Version\/(\d+).*Safari/, "Safari"],
];

const SYSTEMES: [RegExp, string][] = [
  [/iPhone|iPad|iPod/, "iOS"],
  [/Android/, "Android"],
  [/Mac OS X/, "macOS"],
  [/Windows/, "Windows"],
  [/Linux/, "Linux"],
];

/** Résumé lisible du navigateur (« Chrome 120 · Windows ») à partir de l'en-tête technique. */
export function resumeNavigateur(ua: string | null | undefined): string | null {
  if (!ua?.trim()) return null;
  const nav = NAVIGATEURS.find(([r]) => r.test(ua));
  const sys = SYSTEMES.find(([r]) => r.test(ua));
  const version = nav ? (ua.match(nav[0])?.[1] ?? "") : "";
  const parties = [nav ? `${nav[1]}${version ? ` ${version}` : ""}` : null, sys ? sys[1] : null].filter(Boolean);
  return parties.length ? parties.join(" · ") : ua.slice(0, 80);
}
