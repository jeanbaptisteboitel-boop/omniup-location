import Link from "next/link";
import { nomComplet } from "@/lib/libelles";

/** Noms des locataires d'un bail, chacun en lien vers sa fiche : « A », « A et B », « A, B et C ». */
export function LiensLocataires({ locataires, className = "hover:underline" }: { locataires: { id: number; civilite?: string | null; prenom: string; nom: string }[]; className?: string }) {
  if (locataires.length === 0) return <span className="text-slate-400">Aucun locataire</span>;
  return (
    <>
      {locataires.map((l, i) => (
        <span key={l.id}>
          {i > 0 && (i === locataires.length - 1 ? " et " : ", ")}
          <Link href={`/locataires/${l.id}`} className={className}>
            {nomComplet(l)}
          </Link>
        </span>
      ))}
    </>
  );
}
