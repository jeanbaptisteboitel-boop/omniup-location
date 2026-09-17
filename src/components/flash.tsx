import { Alerte } from "./ui";

/** Message flash transmis par l'URL (?message=… ou ?erreur=…). */
export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const erreur = typeof sp.erreur === "string" ? sp.erreur : null;
  const message = typeof sp.message === "string" ? sp.message : null;
  if (!erreur && !message) return null;
  return <div className="mb-4" data-flash>{erreur ? <Alerte ton="rouge">{erreur}</Alerte> : <Alerte ton="vert">{message}</Alerte>}</div>;
}
