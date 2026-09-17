import "server-only";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** Stockage objet compatible S3 (Scaleway Object Storage en production). */

export function configure(): boolean {
  return !!(process.env.SCW_ACCESS_KEY && process.env.SCW_SECRET_KEY && process.env.SCW_BUCKET);
}

export function region(): string {
  return process.env.SCW_REGION?.trim() || "fr-par";
}

export function endpoint(): string {
  return process.env.SCW_ENDPOINT?.trim() || `https://s3.${region()}.scw.cloud`;
}

export function bucket(): string {
  return process.env.SCW_BUCKET!;
}

let client: S3Client | null = null;

export function clientS3(): S3Client {
  if (!configure()) throw new Error("Stockage objet non configuré (SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET).");
  if (!client) {
    client = new S3Client({
      region: region(),
      endpoint: endpoint(),
      credentials: { accessKeyId: process.env.SCW_ACCESS_KEY!, secretAccessKey: process.env.SCW_SECRET_KEY! },
      forcePathStyle: true,
    });
  }
  return client;
}

export async function enregistrer(chemin: string, contenu: Buffer, mimeType: string): Promise<void> {
  await clientS3().send(new PutObjectCommand({ Bucket: bucket(), Key: chemin, Body: contenu, ContentType: mimeType }));
}

export async function lire(chemin: string): Promise<Buffer> {
  const r = await clientS3().send(new GetObjectCommand({ Bucket: bucket(), Key: chemin }));
  if (!r.Body) throw new Error("Objet vide.");
  return Buffer.from(await r.Body.transformToByteArray());
}

export async function supprimer(chemin: string): Promise<void> {
  await clientS3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: chemin }));
}

export async function taille(chemin: string): Promise<number | null> {
  try {
    const r = await clientS3().send(new HeadObjectCommand({ Bucket: bucket(), Key: chemin }));
    return r.ContentLength ?? 0;
  } catch {
    return null;
  }
}

/** URL signée de lecture (5 minutes), avec nom de fichier et disposition. */
export async function urlLecture(chemin: string, nomFichier: string, mimeType: string, telecharger: boolean): Promise<string> {
  const nomAscii = nomFichier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const disposition = `${telecharger ? "attachment" : "inline"}; filename="${nomAscii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`;
  return getSignedUrl(clientS3(), new GetObjectCommand({ Bucket: bucket(), Key: chemin, ResponseContentDisposition: disposition, ResponseContentType: mimeType }), { expiresIn: 300 });
}

/** URL signée d'envoi direct depuis le navigateur (PUT, 10 minutes). */
export async function urlEnvoi(chemin: string, mimeType: string): Promise<string> {
  return getSignedUrl(clientS3(), new PutObjectCommand({ Bucket: bucket(), Key: chemin, ContentType: mimeType }), { expiresIn: 600 });
}
