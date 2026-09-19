import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { avecMessage } from "./erreurs";
import { entiteCouranteId } from "./entite";
import { estAdministrateur, exigerSession, peutEcrire, type Session } from "./utilisateurs";

/** Contrôles de droits appelés en tête des actions serveur : retour à la page d'origine avec un message en cas de refus. */

async function refuser(message: string): Promise<never> {
  const referer = (await headers()).get("referer");
  let cible = "/";
  try {
    if (referer) cible = new URL(referer).pathname || "/";
  } catch {
    cible = "/";
  }
  redirect(avecMessage(cible, message, "erreur"));
}

/** Rôle gestionnaire ou administrateur sur l'entité de travail (refus en lecture seule). */
export async function exigerEcriture(): Promise<Session> {
  const session = await exigerSession();
  if (!peutEcrire(session, await entiteCouranteId())) await refuser("Votre accès à cette entité est en lecture seule : cette action n'est pas autorisée.");
  return session;
}

/** Rôle administrateur sur l'entité de travail (paramètres, utilisateurs). */
export async function exigerAdministration(): Promise<Session> {
  const session = await exigerSession();
  if (!estAdministrateur(session, await entiteCouranteId())) await refuser("Cette action est réservée aux administrateurs de l'entité.");
  return session;
}

/** Super-administrateur (création et suppression d'entités, mode multi-entités). */
export async function exigerSuperAdmin(): Promise<Session> {
  const session = await exigerSession();
  if (!session.superAdmin) await refuser("Cette action est réservée au super-administrateur.");
  return session;
}
