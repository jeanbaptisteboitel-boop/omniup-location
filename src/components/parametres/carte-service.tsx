import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";

/** Carte d'un service de la page Paramètres : icône, nom, badge d'état, détail et action (ou variables d'environnement). */
export function CarteService({ icone, nom, configure, detail, action, variables }: { icone: ReactNode; nom: string; configure: boolean; detail: ReactNode; action?: ReactNode; variables?: string }) {
  return (
    <Card className="flex flex-col gap-2.5 px-5 py-[18px]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-800">{icone}</span>
          <strong className="text-[15px] font-bold text-navy-900">{nom}</strong>
        </div>
        <Badge ton={configure ? "vert" : "orange"}>{configure ? "Configuré" : "Non configuré"}</Badge>
      </div>
      <p className="flex-1 text-[13px] leading-normal text-slate-600">{detail}</p>
      {action ? (
        <div className="flex flex-wrap items-center gap-2">{action}</div>
      ) : variables ? (
        <p className="text-xs text-slate-500">
          Variables : <code className="font-mono text-[11px] text-navy-800">{variables}</code>
        </p>
      ) : null}
    </Card>
  );
}
