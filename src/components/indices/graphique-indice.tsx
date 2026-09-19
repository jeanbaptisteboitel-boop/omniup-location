import { libellePeriode } from "@/lib/insee/periodes";
import { formatIndice } from "@/lib/insee/utils";

/** Courbe d'un indice en SVG (rendu côté serveur, sans bibliothèque) : valeurs par période, repères horizontaux. */
export function GraphiqueIndice({ points, hauteur = 240 }: { points: { periode: string; valeur: number; statut?: string | null }[]; hauteur?: number }) {
  if (points.length < 2) return <p className="text-sm text-slate-500">Pas assez de valeurs pour tracer une courbe.</p>;
  const largeur = 760;
  const gauche = 64;
  const droite = 16;
  const haut = 12;
  const bas = 30;
  const valeurs = points.map((p) => p.valeur);
  const min = Math.min(...valeurs);
  const max = Math.max(...valeurs);
  const amplitude = max - min || Math.abs(max) * 0.02 || 1;
  const x = (i: number) => gauche + (i * (largeur - gauche - droite)) / (points.length - 1);
  const y = (v: number) => haut + ((max - v) / amplitude) * (hauteur - haut - bas);
  const chemin = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(" ");
  const reperes = [0, 0.25, 0.5, 0.75, 1].map((t) => min + t * amplitude);
  const etiquettesX = [0, Math.floor((points.length - 1) / 2), points.length - 1].filter((v, i, a) => a.indexOf(v) === i);
  const dernier = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${largeur} ${hauteur}`} className="h-auto w-full" role="img" aria-label={`Évolution de ${libellePeriode(points[0].periode)} à ${libellePeriode(dernier.periode)} : de ${formatIndice(points[0].valeur)} à ${formatIndice(dernier.valeur)}`}>
      {reperes.map((v) => (
        <g key={v}>
          <line x1={gauche} x2={largeur - droite} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeWidth={1} />
          <text x={gauche - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill="#64748b" fontFamily="JetBrains Mono, monospace">
            {formatIndice(v)}
          </text>
        </g>
      ))}
      <path d={chemin} fill="none" stroke="#17b8de" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => p.statut === "P" && <circle key={p.periode} cx={x(i)} cy={y(p.valeur)} r={4} fill="#fff" stroke="#d97706" strokeWidth={2} />)}
      <circle cx={x(points.length - 1)} cy={y(dernier.valeur)} r={4} fill="#172c52" />
      {etiquettesX.map((i) => (
        <text key={i} x={x(i)} y={hauteur - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize={11} fill="#64748b">
          {libellePeriode(points[i].periode)}
        </text>
      ))}
    </svg>
  );
}
