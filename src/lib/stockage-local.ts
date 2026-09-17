import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

const RACINE = path.resolve(process.env.STORAGE_DIR || "storage");

function absolu(chemin: string): string {
  const abs = path.resolve(RACINE, chemin);
  if (!abs.startsWith(RACINE + path.sep)) throw new Error("Chemin de fichier invalide.");
  return abs;
}

function verifierEcritureAutorisee(): void {
  if (process.env.VERCEL) {
    throw new Error("Sur Vercel, le disque n'est pas persistant : configurez le stockage objet Scaleway (variables SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET, SCW_REGION).");
  }
}

export async function enregistrer(chemin: string, contenu: Buffer): Promise<void> {
  verifierEcritureAutorisee();
  const abs = absolu(chemin);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, contenu);
}

export async function lire(chemin: string): Promise<Buffer> {
  return fs.readFile(absolu(chemin));
}

export async function supprimer(chemin: string): Promise<void> {
  try {
    await fs.unlink(absolu(chemin));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export async function taille(chemin: string): Promise<number | null> {
  try {
    return (await fs.stat(absolu(chemin))).size;
  } catch {
    return null;
  }
}

export function racine(): string {
  return RACINE;
}
