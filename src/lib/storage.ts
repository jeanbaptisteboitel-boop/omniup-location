import "server-only";
import { randomUUID } from "node:crypto";
import * as local from "./stockage-local";
import * as s3 from "./stockage-s3";

export { TYPES_ACCEPTES } from "./storage-constantes";

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

export type FichierEnregistre = {
  chemin: string;
  nomFichier: string;
  mimeType: string;
  taille: number;
};

export type Metadonnees = { nom: string; type: string; taille: number };

function extensionDe(nom: string): string {
  const i = nom.lastIndexOf(".");
  return i === -1 ? "" : nom.slice(i + 1).toLowerCase();
}

/** Type MIME effectif d'un fichier (type déclaré par le navigateur, sinon extension). */
export function typeMimeDe(fichier: { name: string; type: string }): string | null {
  const declare = (fichier.type || "").toLowerCase();
  if (EXTENSIONS_PAR_TYPE[declare]) return declare === "image/jpg" ? "image/jpeg" : declare;
  return TYPES_PAR_EXTENSION[extensionDe(fichier.name)] ?? null;
}

/** Message d'erreur si le fichier n'est pas acceptable, sinon null. */
export function verifierFichier(file: File | null | undefined): string | null {
  if (!file || file.size === 0) return "Sélectionnez un fichier.";
  return verifierMetadonnees({ nom: file.name, type: file.type, taille: file.size });
}

export function verifierMetadonnees(m: Metadonnees): string | null {
  if (!m.taille) return "Fichier vide.";
  if (m.taille > TAILLE_MAX_FICHIER) return "Le fichier dépasse 20 Mo.";
  if (!typeMimeDe({ name: m.nom, type: m.type })) return "Format non pris en charge (PDF, JPG, PNG, WEBP ou HEIC).";
  return null;
}

/** Vrai quand les fichiers sont stockés sur le stockage objet (Scaleway). */
export function stockageObjetConfigure(): boolean {
  return s3.configure();
}

export function descriptionStockage(): string {
  return s3.configure() ? `Stockage objet Scaleway — bucket ${s3.bucket()} (${s3.endpoint()})` : `Disque local — ${local.racine()}`;
}

const CHEMIN_VALIDE = /^[a-z0-9][a-z0-9/_.-]*$/i;

function verifierChemin(chemin: string, prefixe?: string): void {
  if (!CHEMIN_VALIDE.test(chemin) || chemin.includes("..") || chemin.includes("//")) throw new Error("Chemin de fichier invalide.");
  if (prefixe && !chemin.startsWith(prefixe)) throw new Error("Chemin de fichier invalide.");
}

export function nouveauChemin(sousDossier: string, mimeType: string): string {
  return `${sousDossier}/${randomUUID()}.${EXTENSIONS_PAR_TYPE[mimeType] ?? "bin"}`;
}

/** Enregistrement côté serveur (fichier reçu dans un formulaire). */
export async function enregistrerFichier(file: File, sousDossier: string): Promise<FichierEnregistre> {
  const mimeType = typeMimeDe(file);
  if (!mimeType) throw new Error("Format de fichier non pris en charge.");
  const chemin = nouveauChemin(sousDossier, mimeType);
  const contenu = Buffer.from(await file.arrayBuffer());
  if (s3.configure()) await s3.enregistrer(chemin, contenu, mimeType);
  else await local.enregistrer(chemin, contenu);
  return { chemin, nomFichier: file.name || `fichier.${EXTENSIONS_PAR_TYPE[mimeType]}`, mimeType, taille: contenu.length };
}

export async function lireFichier(chemin: string): Promise<Buffer> {
  verifierChemin(chemin);
  return s3.configure() ? s3.lire(chemin) : local.lire(chemin);
}

export async function supprimerFichier(chemin: string | null | undefined): Promise<void> {
  if (!chemin) return;
  verifierChemin(chemin);
  if (s3.configure()) await s3.supprimer(chemin);
  else await local.supprimer(chemin);
}

/** URL signée de téléchargement (stockage objet) ; null si les fichiers sont servis par l'application. */
export async function urlTelechargement(chemin: string, nomFichier: string, mimeType: string, telecharger: boolean): Promise<string | null> {
  verifierChemin(chemin);
  if (!s3.configure()) return null;
  return s3.urlLecture(chemin, nomFichier, mimeType, telecharger);
}

export type PreparationEnvoi = { chemin: string; url: string; mimeType: string; nomFichier: string };

/**
 * Prépare un envoi direct navigateur → stockage objet (URL PUT signée).
 * Retourne null si les fichiers doivent transiter par le serveur (stockage local).
 */
export async function preparerEnvoiDirect(sousDossier: string, m: Metadonnees): Promise<PreparationEnvoi | null> {
  const probleme = verifierMetadonnees(m);
  if (probleme) throw new Error(probleme);
  if (!s3.configure()) return null;
  const mimeType = typeMimeDe({ name: m.nom, type: m.type })!;
  const chemin = nouveauChemin(sousDossier, mimeType);
  return { chemin, url: await s3.urlEnvoi(chemin, mimeType), mimeType, nomFichier: m.nom };
}

/** Vérifie qu'un fichier envoyé directement existe bien et renvoie sa taille. */
export async function confirmerEnvoiDirect(chemin: string, prefixe: string): Promise<number> {
  verifierChemin(chemin, prefixe);
  const t = s3.configure() ? await s3.taille(chemin) : await local.taille(chemin);
  if (t === null) throw new Error("Le fichier n'a pas été reçu par le stockage (vérifiez la configuration CORS du bucket).");
  if (t > TAILLE_MAX_FICHIER) {
    await supprimerFichier(chemin);
    throw new Error("Le fichier dépasse 20 Mo.");
  }
  return t;
}

export function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
