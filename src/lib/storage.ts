import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const RACINE = path.resolve(process.env.STORAGE_DIR || "storage");

export const TAILLE_MAX_FICHIER = 20 * 1024 * 1024; // 20 Mo

const EXTENSIONS_PAR_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
};

const TYPES_PAR_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
};

export { TYPES_ACCEPTES } from "./storage-constantes";

export type FichierEnregistre = {
  chemin: string;
  nomFichier: string;
  mimeType: string;
  taille: number;
};

function extensionDe(nom: string): string {
  return path.extname(nom).replace(".", "").toLowerCase();
}

/** Détermine le type MIME effectif d'un fichier importé (type du navigateur ou extension). */
export function typeMimeDe(file: File): string | null {
  const declare = (file.type || "").toLowerCase();
  if (EXTENSIONS_PAR_TYPE[declare]) return declare === "image/jpg" ? "image/jpeg" : declare;
  const parExtension = TYPES_PAR_EXTENSION[extensionDe(file.name)];
  return parExtension ?? null;
}

/** Retourne un message d'erreur si le fichier n'est pas acceptable, sinon null. */
export function verifierFichier(file: File | null | undefined): string | null {
  if (!file || file.size === 0) return "Sélectionnez un fichier.";
  if (file.size > TAILLE_MAX_FICHIER) return "Le fichier dépasse 20 Mo.";
  if (!typeMimeDe(file)) return "Format non pris en charge (PDF, JPG, PNG, WEBP ou HEIC).";
  return null;
}

function cheminAbsolu(chemin: string): string {
  const abs = path.resolve(RACINE, chemin);
  if (!abs.startsWith(RACINE + path.sep)) throw new Error("Chemin de fichier invalide.");
  return abs;
}

export async function enregistrerFichier(file: File, sousDossier: string): Promise<FichierEnregistre> {
  const mimeType = typeMimeDe(file);
  if (!mimeType) throw new Error("Format de fichier non pris en charge.");
  const ext = EXTENSIONS_PAR_TYPE[mimeType];
  const chemin = path.posix.join(sousDossier, `${randomUUID()}.${ext}`);
  const abs = cheminAbsolu(chemin);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(abs, buffer);
  return { chemin, nomFichier: file.name || `fichier.${ext}`, mimeType, taille: buffer.length };
}

export async function lireFichier(chemin: string): Promise<Buffer> {
  return fs.readFile(cheminAbsolu(chemin));
}

export async function supprimerFichier(chemin: string | null | undefined): Promise<void> {
  if (!chemin) return;
  try {
    await fs.unlink(cheminAbsolu(chemin));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
