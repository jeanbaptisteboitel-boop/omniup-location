/** Côté navigateur : envoi d'un fichier directement vers le stockage objet quand il est configuré. */

export type FichierTeleverse = { chemin: string; nomFichier: string; mimeType: string; taille: number };

export type ReponsePreparation =
  | { ok: true; preparation: { chemin: string; url: string; mimeType: string; nomFichier: string } | null }
  | { ok: false; erreur: string };

export type Preparateur = (nom: string, type: string, taille: number) => Promise<ReponsePreparation>;

export async function televerser(file: File, preparer: Preparateur): Promise<{ mode: "direct"; fichier: FichierTeleverse } | { mode: "serveur" }> {
  const r = await preparer(file.name, file.type, file.size);
  if (!r.ok) throw new Error(r.erreur);
  if (!r.preparation) return { mode: "serveur" };
  const { chemin, url, mimeType, nomFichier } = r.preparation;
  let reponse: Response;
  try {
    reponse = await fetch(url, { method: "PUT", body: file, headers: { "Content-Type": mimeType } });
  } catch {
    // « Failed to fetch » : le bucket n'autorise pas l'origine du site (règle CORS absente) ou le réseau bloque le stockage.
    throw new Error("Le navigateur n'a pas pu joindre le stockage objet : le bucket n'autorise pas encore l'envoi direct depuis ce site (règle CORS) ou le réseau le bloque. Dans Paramètres, cliquez sur « Autoriser l'envoi direct », puis réessayez.");
  }
  if (!reponse.ok) throw new Error(`Échec de l'envoi vers le stockage (${reponse.status}). Vérifiez la configuration CORS du bucket.`);
  return { mode: "direct", fichier: { chemin, nomFichier, mimeType, taille: file.size } };
}
