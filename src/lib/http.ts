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

/** Génère un PDF et le renvoie. En cas d'échec, la cause est journalisée (visible dans les logs Vercel) et une réponse 500 lisible est renvoyée. */
export async function reponsePdf(nomFichier: string, telecharger: boolean, generer: () => Promise<Buffer>, contexte: string): Promise<Response> {
  let contenu: Buffer;
  try {
    contenu = await generer();
  } catch (e) {
    console.error(`[pdf] Échec de la génération (${contexte}) :`, e);
    const detail = e instanceof Error ? e.message : String(e);
    return new Response(`La génération du PDF a échoué (${contexte}) : ${detail}`, { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
  }
  return reponseFichier(contenu, "application/pdf", nomFichier, telecharger);
}
