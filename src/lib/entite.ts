import "server-only";
import { cookies } from "next/headers";
import type { Entite, Reglages } from "@prisma/client";
import { prisma } from "./prisma";

/**
 * Entités (dossiers) : par défaut l'application ne gère qu'une entité.
 * Lorsque la gestion multi-entités est activée dans les réglages, l'entité courante
 * est choisie dans la barre latérale et mémorisée dans un cookie.
 */

export const COOKIE_ENTITE = "omniup_entite";

export async function reglages(): Promise<Pick<Reglages, "multiEntites">> {
  const r = await prisma.reglages.findUnique({ where: { id: 1 } });
  return r ?? { multiEntites: false };
}

export async function multiEntitesActif(): Promise<boolean> {
  return (await reglages()).multiEntites;
}

async function entiteParDefaut(): Promise<Entite> {
  const premiere = await prisma.entite.findFirst({ orderBy: { id: "asc" } });
  if (premiere) return premiere;
  return prisma.entite.create({ data: { nom: "Mon entité" } });
}

/** Entité dont les données sont affichées et modifiées. */
export async function entiteCourante(): Promise<Entite> {
  if (await multiEntitesActif()) {
    const magasin = await cookies();
    const id = Number(magasin.get(COOKIE_ENTITE)?.value);
    if (Number.isInteger(id) && id > 0) {
      const e = await prisma.entite.findUnique({ where: { id } });
      if (e) return e;
    }
  }
  return entiteParDefaut();
}

export async function entiteCouranteId(): Promise<number> {
  return (await entiteCourante()).id;
}

export async function listeEntites(): Promise<Entite[]> {
  return prisma.entite.findMany({ orderBy: { nom: "asc" } });
}

/** Nombre d'enregistrements rattachés à une entité (pour interdire sa suppression). */
export async function volumeEntite(id: number): Promise<number> {
  const [bailleurs, immeubles, lots, locataires, baux, depenses, emprunts, documents] = await Promise.all([
    prisma.bailleur.count({ where: { entiteId: id } }),
    prisma.immeuble.count({ where: { entiteId: id } }),
    prisma.lot.count({ where: { entiteId: id } }),
    prisma.locataire.count({ where: { entiteId: id } }),
    prisma.bail.count({ where: { entiteId: id } }),
    prisma.depense.count({ where: { entiteId: id } }),
    prisma.emprunt.count({ where: { entiteId: id } }),
    prisma.documentGenere.count({ where: { entiteId: id } }),
  ]);
  return bailleurs + immeubles + lots + locataires + baux + depenses + emprunts + documents;
}
