"use client";

/** Sélecteur de rôle soumis dès le changement (tableau des utilisateurs). */
export function RoleSelect({ action, utilisateurId, entiteId, role, roles }: { action: (fd: FormData) => Promise<void>; utilisateurId: number; entiteId: number; role: string; roles: { value: string; label: string }[] }) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="utilisateurId" value={utilisateurId} />
      <input type="hidden" name="entiteId" value={entiteId} />
      <select name="role" defaultValue={role} onChange={(ev) => ev.currentTarget.form?.requestSubmit()} aria-label="Rôle" className="h-8 cursor-pointer rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-navy-900 focus:border-brand-cyan focus:outline-none">
        {roles.map((r) => (
          <option key={r.value} value={r.value}>{r.label}</option>
        ))}
      </select>
    </form>
  );
}
