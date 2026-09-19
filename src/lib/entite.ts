import "server-only";
import { cookies } from "next/headers";
import type { Entite, Prisma, Reglages } from "@prisma/client";
import { prisma } from "./prisma";
import { entitesAccessibles, sessionCourante } from "./utilisateurs";

/**
 * Entités (dossiers) : par défaut l'application ne gère qu'une entité.
 * Lorsque la gestion multi-entités est activée dans les réglages, l'entité courante
 * est choisie dans la barre latérale et mémorisée dans un cookie.
 * Un utilisateur ne voit que les entités sur lesquelles il a un droit ; le compte principal et le super-administrateur voient tout.
 */

/** Filtre Prisma des entités accessibles à la session courante (null = aucune). */
async function filtreAccessibles(): Promise<Prisma.EntiteWhereInput | null> {
  const session = await sessionCourante();
  if (!session) return null;
  const acces = entitesAccessibles(session);
  return acces === "toutes" ? {} : { id: { in: acces } };
}

export const COOKIE_ENTITE = "omniup_entite";

export async function reglages(): Promise<Pick<Reglages, "multiEntites">> {
  const r = await prisma.reglages.findUnique({ where: { id: 1 } });
  return r ?? { multiEntites: false };
}

export async function multiEntitesActif(): Promise<boolean> {
  return (await reglages()).multiEntites;
}

export class ErreurAccesEntite extends Error {}

async function entiteParDefaut(filtre: Prisma.EntiteWhereInput | null): Promise<Entite> {
  if (filtre === null) throw new ErreurAccesEntite("Connexion requise.");
  const premiere = await prisma.entite.findFirst({ where: filtre, orderBy: { id: "asc" } });
  if (premiere) return premiere;
  if (Object.keys(filtre).length === 0) return prisma.entite.create({ data: { nom: "Mon entité" } });
  throw new ErreurAccesEntite("Aucune entité ne vous est accessible : demandez un accès à un administrateur.");
}

/** Entité dont les données sont affichées et modifiées (parmi celles accessibles à la session). */
export async function entiteCourante(): Promise<Entite> {
  const filtre = await filtreAccessibles();
  if (filtre !== null && (await multiEntitesActif())) {
    const magasin = await cookies();
    const id = Number(magasin.get(COOKIE_ENTITE)?.value);
    if (Number.isInteger(id) && id > 0) {
      const e = await prisma.entite.findFirst({ where: { id, ...filtre } });
      if (e) return e;
    }
  }
  return entiteParDefaut(filtre);
}

export async function entiteCouranteId(): Promise<number> {
  return (await entiteCourante()).id;
}

/** Entités accessibles à la session courante. */
export async function listeEntites(): Promise<Entite[]> {
  const filtre = await filtreAccessibles();
  if (filtre === null) return [];
  return prisma.entite.findMany({ where: filtre, orderBy: { nom: "asc" } });
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
