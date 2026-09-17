import { Prisma } from "@prisma/client";

/** Suppression refusée car d'autres enregistrements dépendent de celui-ci. */
export function estContrainteReference(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2003" || e.code === "P2014");
}

export function estIntrouvable(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025";
}

/** Construit une URL avec un message flash. */
export function avecMessage(url: string, message: string, type: "message" | "erreur" = "message"): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${type}=${encodeURIComponent(message)}`;
}
