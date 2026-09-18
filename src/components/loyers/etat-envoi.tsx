import { formatDate } from "@/lib/dates";

/** État d'envoi de l'avis d'échéance : « Envoyé le … » (vert) ou « À envoyer » (orange). */
export function EtatAvis({ date, className = "text-[13px]" }: { date: Date | null; className?: string }) {
  return date ? (
    <span className={`whitespace-nowrap font-semibold text-emerald-800 ${className}`}>Envoyé le {formatDate(date)}</span>
  ) : (
    <span className={`whitespace-nowrap font-semibold text-amber-800 ${className}`}>À envoyer</span>
  );
}

/** État d'envoi de la quittance : envoyée (vert), à envoyer si le loyer est réglé (orange), sinon « — ». */
export function EtatQuittance({ date, paye, className = "text-[13px]" }: { date: Date | null; paye: boolean; className?: string }) {
  if (date) return <span className={`whitespace-nowrap font-semibold text-emerald-800 ${className}`}>Envoyée le {formatDate(date)}</span>;
  if (paye) return <span className={`whitespace-nowrap font-semibold text-amber-800 ${className}`}>À envoyer</span>;
  return <span className={`font-semibold text-slate-400 ${className}`}>—</span>;
}
