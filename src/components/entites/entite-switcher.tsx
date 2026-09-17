"use client";

import { usePathname } from "next/navigation";
import { IconeChevronsVertical, IconeEntites } from "@/components/icones";

/** Sélecteur d'entité de travail (barre latérale), soumis dès le changement. */
export function EntiteSwitcher({ entites, couranteId, action }: { entites: { id: number; nom: string }[]; couranteId: number; action: (fd: FormData) => Promise<void> }) {
  const pathname = usePathname();
  return (
    <form action={action} className="mx-1 mt-3.5">
      <input type="hidden" name="retour" value={pathname} />
      <label htmlFor="entiteId" className="sr-only">Entité de travail</label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-cyan"><IconeEntites taille={16} strokeWidth={2} /></span>
        <select
          key={couranteId}
          id="entiteId"
          name="entiteId"
          defaultValue={couranteId}
          onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
          className="block h-10 w-full cursor-pointer appearance-none truncate rounded-lg border border-white/14 bg-white/6 pl-9 pr-8 text-[13px] font-semibold text-white hover:bg-white/12 focus:outline-none focus-visible:outline-2 focus-visible:outline-brand-cyan"
        >
          {entites.map((e) => (
            <option key={e.id} value={e.id} className="text-navy-950">{e.nom}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-navy-200"><IconeChevronsVertical taille={14} /></span>
      </div>
    </form>
  );
}
