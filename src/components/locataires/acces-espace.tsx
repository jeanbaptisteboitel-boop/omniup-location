import { formatDateHeure } from "@/lib/dates";
import { creerAccesLocataire, envoyerAccesLocataire, revoquerAccesLocataire } from "@/actions/espace";
import { Badge, Button, Card, CardBody, CardHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { BoutonCopier } from "./bouton-copier";

/** Carte « Espace locataire » de la fiche d'un locataire : création, envoi, copie et révocation du lien d'accès. */
export function AccesEspace({
  locataire,
  lien,
  mailConfigure,
}: {
  locataire: { id: number; email: string | null; accesJeton: string | null; accesCreeLe: Date | null; accesEnvoyeLe: Date | null; accesDernierLe: Date | null };
  lien: string | null;
  mailConfigure: boolean;
}) {
  const actif = !!locataire.accesJeton && !!lien;
  const envoiPossible = !!locataire.email && mailConfigure;
  return (
    <Card>
      <CardHeader titre="Espace locataire" description="Le locataire y consulte son bail, l'exemplaire signé, ses avis d'échéance, ses quittances, ses courriers et son solde." actions={actif ? <Badge ton="vert">Accès actif</Badge> : <Badge ton="gris">Aucun accès</Badge>} />
      <CardBody>
        {actif ? (
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Lien d'accès personnel</p>
              <div className="flex gap-2">
                <input readOnly value={lien} aria-label="Lien d'accès" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs text-navy-900" />
                <BoutonCopier texte={lien} />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Créé le {formatDateHeure(locataire.accesCreeLe)} · {locataire.accesEnvoyeLe ? `envoyé par email le ${formatDateHeure(locataire.accesEnvoyeLe)}` : "jamais envoyé par email"} · {locataire.accesDernierLe ? `dernière visite le ${formatDateHeure(locataire.accesDernierLe)}` : "aucune visite pour l'instant"}
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={envoyerAccesLocataire}>
                <input type="hidden" name="id" value={locataire.id} />
                <Button type="submit" taille="sm" disabled={!envoiPossible}>{locataire.accesEnvoyeLe ? "Renvoyer le lien par email" : "Envoyer le lien par email"}</Button>
              </form>
              <ConfirmForm action={revoquerAccesLocataire} titre="Révoquer l'accès ?" message="Le lien actuel cessera de fonctionner immédiatement et le locataire sera déconnecté. Vous pourrez créer un nouveau lien ensuite." libelleConfirmer="Révoquer l'accès">
                <input type="hidden" name="id" value={locataire.id} />
                <Button type="submit" variante="danger" taille="sm">Révoquer</Button>
              </ConfirmForm>
            </div>
            {!envoiPossible && <p className="text-xs text-amber-700">{!locataire.email ? "Sans adresse email dans la fiche, copiez le lien et transmettez-le vous-même." : "L'envoi d'emails n'est pas configuré (Paramètres) : copiez le lien et transmettez-le vous-même."}</p>}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-slate-600">Créez un lien d'accès personnel, puis envoyez-le par email ou transmettez-le au locataire. Le lien reste valable jusqu'à sa révocation.</p>
            <div className="flex flex-wrap gap-2">
              <form action={creerAccesLocataire}>
                <input type="hidden" name="id" value={locataire.id} />
                <Button type="submit" taille="sm" variante={envoiPossible ? "secondary" : "primary"}>Créer l'accès</Button>
              </form>
              {envoiPossible && (
                <form action={envoyerAccesLocataire}>
                  <input type="hidden" name="id" value={locataire.id} />
                  <Button type="submit" taille="sm">Créer et envoyer par email</Button>
                </form>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
