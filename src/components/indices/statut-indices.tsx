"use client";

import { formatDate, parseDateISO } from "@/lib/dates";
import { dernierIndice, formatIndice } from "@/lib/insee/utils";
import type { EtatIndices } from "./use-indices";

/** Ligne d'état sous un champ d'indice : dernier indice publié par l'INSEE, chargement ou indisponibilité. */
export function StatutIndices({ etat, libelle = "indice", onUtiliser, className = "mt-1.5" }: { etat: EtatIndices; libelle?: string; onUtiliser?: () => void; className?: string }) {
  if (etat.statut === "inactif") return null;
  if (etat.statut === "chargement") {
    return (
      <p className={`${className} text-xs text-slate-500`} aria-live="polite">
        Recherche du dernier {libelle} publié par l'INSEE…
      </p>
    );
  }
  if (etat.statut === "erreur" || !etat.serie) {
    return (
      <p className={`${className} text-xs text-amber-700`} aria-live="polite">
        Indices INSEE indisponibles pour le moment ({etat.erreur ?? "erreur inconnue"}) : saisissez la valeur publiée sur insee.fr.
      </p>
    );
  }
  const dernier = dernierIndice(etat.serie);
  const miseAJour = etat.serie.miseAJour ? parseDateISO(etat.serie.miseAJour.slice(0, 10)) : null;
  return (
    <p className={`${className} text-xs text-slate-500`} aria-live="polite">
      Dernier {libelle} publié par l'INSEE : <strong className="text-navy-900">{dernier ? `${dernier.trimestre} = ${formatIndice(dernier.valeur)}` : "—"}</strong>
      {miseAJour ? ` (mis à jour le ${formatDate(miseAJour)})` : ""} · série {etat.serie.idbank}.
      {onUtiliser && dernier && (
        <>
          {" "}
          <button type="button" onClick={onUtiliser} className="font-semibold text-navy-800 underline underline-offset-2 hover:text-brand-cyan-dark">
            Utiliser cet indice
          </button>
        </>
      )}
    </p>
  );
}

/** Tableau des derniers trimestres publiés, avec la variation sur un an. */
export function TableauIndices({ etat, nb = 8 }: { etat: EtatIndices; nb?: number }) {
  if (etat.statut !== "ok" || !etat.serie) return null;
  const obs = etat.serie.observations;
  const lignes = obs.slice(-nb).reverse();
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="text-left text-slate-500">
          <th className="py-1 font-semibold">Trimestre</th>
          <th className="py-1 text-right font-semibold">Indice</th>
          <th className="py-1 text-right font-semibold">Variation sur un an</th>
        </tr>
      </thead>
      <tbody>
        {lignes.map((o) => {
          const unAnAvant = obs.find((x) => x.periode === `${Number(o.periode.slice(0, 4)) - 1}${o.periode.slice(4)}`);
          const variation = unAnAvant ? ((o.valeur - unAnAvant.valeur) / unAnAvant.valeur) * 100 : null;
          return (
            <tr key={o.periode} className="border-t border-slate-100 text-navy-900">
              <td className="py-1">{o.trimestre}</td>
              <td className="py-1 text-right tabular-nums">{formatIndice(o.valeur)}</td>
              <td className="py-1 text-right tabular-nums">{variation === null ? "—" : `${variation > 0 ? "+" : ""}${variation.toFixed(2).replace(".", ",")} %`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
