/** Réponse HTTP d'un fichier (affichage dans le navigateur ou téléchargement). */
export function reponseFichier(contenu: Buffer, mimeType: string, nomFichier: string, telecharger = false): Response {
  const nomAscii = nomFichier.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const disposition = `${telecharger ? "attachment" : "inline"}; filename="${nomAscii}"; filename*=UTF-8''${encodeURIComponent(nomFichier)}`;
  return new Response(new Uint8Array(contenu), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(contenu.length),
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}
