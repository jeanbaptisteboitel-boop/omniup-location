"use client";

import { usePathname } from "next/navigation";

/** Sélecteur d'entité de travail (barre latérale), soumis dès le changement. */
export function EntiteSwitcher({ entites, couranteId, action }: { entites: { id: number; nom: string }[]; couranteId: number; action: (fd: FormData) => Promise<void> }) {
  const pathname = usePathname();
  return (
    <form action={action} className="px-3">
      <input type="hidden" name="retour" value={pathname} />
      <label htmlFor="entiteId" className="mb-1 block text-[11px] font-semibold uppercase tracking-widest text-navy-300">Entité</label>
      <select
        key={couranteId}
        id="entiteId"
        name="entiteId"
        defaultValue={couranteId}
        onChange={(ev) => ev.currentTarget.form?.requestSubmit()}
        className="block w-full rounded-md border border-white/20 bg-navy-800 px-2 py-1.5 text-sm text-white focus:border-brand-cyan focus:outline-none"
      >
        {entites.map((e) => (
          <option key={e.id} value={e.id}>{e.nom}</option>
        ))}
      </select>
    </form>
  );
}
