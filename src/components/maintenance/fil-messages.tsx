import type { AuteurMessage } from "@prisma/client";
import { formatDateHeure } from "@/lib/dates";
import { formatTaille } from "@/lib/storage";

export type MessageFil = {
  id: number;
  auteur: AuteurMessage;
  texte: string;
  nomFichier: string | null;
  mimeType: string | null;
  taille: number | null;
  createdAt: Date;
};

/**
 * Fil des échanges d'une demande. `cote` désigne celui qui regarde : ses propres messages
 * sont alignés à droite. `basePiece` est l'URL de téléchargement des pièces jointes (suivie de l'identifiant du message).
 */
export function FilMessages({ messages, cote, basePiece }: { messages: MessageFil[]; cote: AuteurMessage; basePiece: string }) {
  const nom = (auteur: AuteurMessage) => (auteur === cote ? "Vous" : auteur === "LOCATAIRE" ? "Le locataire" : "Votre bailleur");
  return (
    <ul className="flex flex-col gap-3 px-5 py-4">
      {messages.map((m) => {
        const mien = m.auteur === cote;
        return (
          <li key={m.id} className={`flex flex-col ${mien ? "items-end" : "items-start"}`}>
            <div className={`max-w-[92%] rounded-xl border px-3.5 py-2.5 sm:max-w-[80%] ${mien ? "border-navy-200 bg-navy-50" : "border-slate-200 bg-white"}`}>
              <p className="text-xs font-semibold text-slate-500">
                {nom(m.auteur)} · {formatDateHeure(m.createdAt)}
              </p>
              <p className="mt-1 whitespace-pre-line break-words text-sm text-navy-950">{m.texte}</p>
              {m.nomFichier && (
                <a href={`${basePiece}/${m.id}`} target="_blank" rel="noopener" className="mt-2 inline-block text-[13px] font-semibold text-navy-800 hover:underline">
                  {m.nomFichier}
                  <span className="ml-1 font-normal text-slate-500">{m.taille ? `· ${formatTaille(m.taille)}` : ""}</span>
                </a>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
