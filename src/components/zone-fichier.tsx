"use client";

import { useRef, useState } from "react";
import { IconeImporter } from "./icones";

/** Zone d'import de fichiers (glisser-déposer ou clic) reliée à un champ <input type="file"> classique. */
export function ZoneFichier({
  name,
  id,
  accept,
  multiple = false,
  libelle = "Glissez-déposez un fichier ou cliquez pour parcourir",
  aide = "PDF, JPG ou PNG · 10 Mo maximum",
  className = "",
  onChange,
}: {
  name: string;
  id?: string;
  accept?: string;
  multiple?: boolean;
  libelle?: string;
  aide?: string;
  className?: string;
  onChange?: (fichiers: File[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [noms, setNoms] = useState<string[]>([]);
  const [survol, setSurvol] = useState(false);

  function retenir(liste: FileList | null) {
    const fichiers = liste ? Array.from(liste) : [];
    setNoms(fichiers.map((f) => f.name));
    onChange?.(fichiers);
  }

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => input.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            input.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!survol) setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          if (input.current && e.dataTransfer.files.length) {
            input.current.files = e.dataTransfer.files;
            retenir(e.dataTransfer.files);
          }
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed px-5 py-7 text-center transition-colors ${survol ? "border-brand-cyan bg-cyan-50" : "border-slate-300 bg-slate-50 hover:border-navy-300"}`}
      >
        <IconeImporter taille={28} className="mx-auto text-navy-500" />
        <p className="mt-2 text-sm font-semibold text-navy-900">{noms.length ? noms.join(", ") : libelle}</p>
        <p className="mt-1 text-xs text-slate-500">{noms.length ? "Cliquez pour remplacer" : aide}</p>
      </div>
      <input ref={input} id={id ?? name} name={name} type="file" accept={accept} multiple={multiple} tabIndex={-1} className="sr-only" onChange={(e) => retenir(e.target.files)} />
    </div>
  );
}
