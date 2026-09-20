import { dateExpiration, decenceEnergetique, etatDpe, LIBELLES_ETAT, loyerGele, MOTIF_GEL, TONS_ETAT, type Dpe } from "@/lib/dpe";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatNombre } from "@/lib/montants";
import { formatTaille } from "@/lib/storage";
import { deposerDpe, preparerEnvoiDpe, supprimerDpe } from "@/actions/lots";
import { Alerte, Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { EchelleDpe, EtiquetteDpe } from "./etiquette-dpe";
import { DepotDpe } from "./depot-dpe";

type Lot = Dpe & {
  id: number;
  dpeNomFichier: string | null;
  dpeChemin: string | null;
  dpeTaille: number | null;
};

/**
 * Carte « Diagnostic de performance énergétique » de la fiche d'un lot : étiquettes, validité,
 * conséquences légales et fichier annexé au bail. Rien n'est bloqué lorsque le DPE manque.
 */
export function CarteDpe({ lot }: { lot: Lot }) {
  const auj = aujourdhui();
  const etat = etatDpe(lot, auj);
  const decence = decenceEnergetique(lot, auj);
  const gele = loyerGele(lot);

  return (
    <Card>
      <CardHeader
        titre="Diagnostic de performance énergétique"
        description="Annexé au contrat de location (article 3-3 de la loi du 6 juillet 1989)."
        actions={<Badge ton={TONS_ETAT[etat]}>{LIBELLES_ETAT[etat]}</Badge>}
      />
      <CardBody className="flex flex-col gap-4">
        {etat === "MANQUANT" ? (
          <Alerte ton="orange" titre="DPE non renseigné">
            Le diagnostic doit être annexé au bail, mais son absence n&apos;empêche pas de louer : le bail reste valable et les loyers restent dus. Renseignez les étiquettes dès que le diagnostic est réalisé.
          </Alerte>
        ) : (
          <>
            {etat === "EXPIRE" && (
              <Alerte ton="rouge" titre="DPE expiré">
                {lot.dpeRealiseLe && lot.dpeRealiseLe.getUTCFullYear() < 2021
                  ? "Réalisé avant la réforme du 1er juillet 2021, ce diagnostic n'est plus valable : faites-en établir un nouveau."
                  : `Ce diagnostic a expiré le ${lot.dpeRealiseLe ? formatDate(dateExpiration(lot.dpeRealiseLe)) : ""}.`}{" "}
                Là encore, la location n&apos;est pas empêchée.
              </Alerte>
            )}
            <div className="flex flex-wrap items-center gap-5">
              {lot.dpeClasseEnergie && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Consommation</p>
                  <div className="flex items-center gap-2.5">
                    <EtiquetteDpe classe={lot.dpeClasseEnergie} />
                    {lot.dpeConsommation !== null && <span className="text-sm text-slate-600">{formatNombre(lot.dpeConsommation)} kWh/m²/an</span>}
                  </div>
                  <div className="mt-2">
                    <EchelleDpe classe={lot.dpeClasseEnergie} />
                  </div>
                </div>
              )}
              {lot.dpeClasseGes && (
                <div>
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Émissions</p>
                  <div className="flex items-center gap-2.5">
                    <EtiquetteDpe classe={lot.dpeClasseGes} type="climat" />
                    {lot.dpeEmissions !== null && <span className="text-sm text-slate-600">{formatNombre(lot.dpeEmissions)} kg CO₂/m²/an</span>}
                  </div>
                  <div className="mt-2">
                    <EchelleDpe classe={lot.dpeClasseGes} type="climat" />
                  </div>
                </div>
              )}
            </div>
            <Infos
              items={[
                { label: "Réalisé le", valeur: lot.dpeRealiseLe ? formatDate(lot.dpeRealiseLe) : "—" },
                { label: "Valable jusqu'au", valeur: lot.dpeRealiseLe ? formatDate(dateExpiration(lot.dpeRealiseLe)) : "—" },
              ]}
            />
          </>
        )}

        {decence && !decence.decent && (
          <Alerte ton="rouge" titre="Logement non décent au sens de la performance énergétique">
            {decence.motif} Le locataire peut exiger la mise en conformité ; le bail en cours reste toutefois valable et le loyer reste dû.
          </Alerte>
        )}
        {decence && decence.decent && decence.prochainPalier && (
          <Alerte ton="orange" titre="Échéance à anticiper">
            Un logement classé {decence.prochainPalier.classe} ne pourra plus être mis en location à compter du 1<sup>er</sup> janvier {decence.prochainPalier.depuis.getUTCFullYear()} : prévoyez les travaux d&apos;amélioration.
          </Alerte>
        )}
        {gele && (
          <Alerte ton="orange" titre="Loyer gelé">
            {MOTIF_GEL} La révision annuelle est refusée sur les baux de ce lot tant que la classe n&apos;est pas améliorée.
          </Alerte>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[.04em] text-slate-500">Fichier du diagnostic</p>
          {lot.dpeChemin ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <div className="min-w-0">
                <a href={`/api/lots/${lot.id}/dpe`} target="_blank" rel="noreferrer" className="text-sm font-medium text-navy-900 underline-offset-2 hover:underline">
                  {lot.dpeNomFichier ?? "Diagnostic"}
                </a>
                {lot.dpeTaille !== null && <p className="text-xs text-slate-500">{formatTaille(lot.dpeTaille)}</p>}
              </div>
              <div className="flex shrink-0 gap-2">
                <ButtonLink href={`/api/lots/${lot.id}/dpe?dl=1`} variante="secondary" taille="sm">Télécharger</ButtonLink>
                {(
                  <ConfirmForm action={supprimerDpe} titre="Retirer le fichier du diagnostic ?" message="Le fichier sera supprimé du stockage. Les étiquettes saisies sont conservées." libelleConfirmer="Retirer">
                    <input type="hidden" name="id" value={lot.id} />
                    <Button type="submit" variante="ghost" taille="sm">Retirer</Button>
                  </ConfirmForm>
                )}
              </div>
            </div>
          ) : (
            <p className="mb-3 text-sm text-slate-600">Aucun fichier joint : le DPE doit être remis au locataire avec le contrat.</p>
          )}
          {!lot.dpeChemin && <DepotDpe action={deposerDpe.bind(null, lot.id)} preparer={preparerEnvoiDpe} />}
        </div>
      </CardBody>
    </Card>
  );
}

