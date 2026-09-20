import type { ClasseEnergie } from "@prisma/client";
import { COULEURS_ENERGIE, COULEURS_GES, texteSurEnergie, texteSurGes } from "@/lib/dpe";

/** Étiquette du DPE, aux couleurs officielles : énergie (dégradé vert → rouge) ou climat (violet). */
export function EtiquetteDpe({ classe, type = "energie", taille = "md" }: { classe: ClasseEnergie; type?: "energie" | "climat"; taille?: "sm" | "md" }) {
  const energie = type === "energie";
  const fond = energie ? COULEURS_ENERGIE[classe] : COULEURS_GES[classe];
  const texte = energie ? texteSurEnergie(classe) : texteSurGes(classe);
  const dimension = taille === "sm" ? "h-7 w-7 text-sm" : "h-10 w-10 text-lg";
  return (
    <span
      className={`inline-flex ${dimension} shrink-0 items-center justify-center rounded-md font-extrabold leading-none`}
      style={{ backgroundColor: fond, color: texte }}
      title={`${energie ? "Consommation énergétique" : "Émissions de gaz à effet de serre"} : classe ${classe}`}
    >
      {classe}
    </span>
  );
}

/** Les sept classes, celle du logement mise en évidence. */
export function EchelleDpe({ classe, type = "energie" }: { classe: ClasseEnergie; type?: "energie" | "climat" }) {
  const classes: ClasseEnergie[] = ["A", "B", "C", "D", "E", "F", "G"];
  const energie = type === "energie";
  return (
    <div className="flex flex-wrap gap-1" role="img" aria-label={`Classe ${classe} sur une échelle de A à G`}>
      {classes.map((c) => {
        const actif = c === classe;
        const fond = energie ? COULEURS_ENERGIE[c] : COULEURS_GES[c];
        const texte = energie ? texteSurEnergie(c) : texteSurGes(c);
        return (
          <span
            key={c}
            aria-hidden
            className={`inline-flex h-7 w-7 items-center justify-center rounded font-bold leading-none ${actif ? "text-sm ring-2 ring-navy-900 ring-offset-1" : "text-xs opacity-45"}`}
            style={{ backgroundColor: fond, color: texte }}
          >
            {c}
          </span>
        );
      })}
    </div>
  );
}
