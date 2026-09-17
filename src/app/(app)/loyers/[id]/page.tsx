import Link from "next/link";
import { notFound } from "next/navigation";
import { idDepuis, type ParamsId, type SearchParams } from "@/lib/params";
import { MODES_PAIEMENT, TYPES_BAIL_COURT, adresseSurUneLigne, nomComplet } from "@/lib/libelles";
import { aujourdhui, formatDate, formatDateHeure, formatPeriode, toISODate } from "@/lib/dates";
import { formatEuros, montantPourSaisie } from "@/lib/montants";
import { etatAppel, numeroAppel, numeroQuittance } from "@/lib/loyers";
import { chargerAppel } from "@/lib/pdf/donnees";
import { mailConfigure } from "@/lib/mail";
import { iaConfiguree } from "@/lib/ia-config";
import { emailAvis, emailQuittance } from "@/lib/mail-modeles";
import { enregistrerPaiement, envoyerAvis, envoyerQuittance, marquerAvisEnvoye, marquerQuittanceEnvoyee, supprimerPaiement } from "@/actions/loyers";
import { genererEmail } from "@/actions/ia";
import { Badge, Button, ButtonLink, Card, CardBody, CardHeader, Infos, PageHeader, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { BadgeStatutAppel } from "@/components/loyers/badge-statut";
import { PaiementForm } from "@/components/loyers/paiement-form";
import { EnvoiEmail } from "@/components/envoi-email";
import { entiteCouranteId } from "@/lib/entite";

export default async function AppelPage({ params, searchParams }: { params: ParamsId; searchParams: SearchParams }) {
  const id = await idDepuis(params);
  const sp = await searchParams;
  const a = await chargerAppel(id);
  if (!a || a.bail.entiteId !== (await entiteCouranteId())) notFound();
  const auj = aujourdhui();
  const etat = etatAppel(a, auj);
  const { bail } = a;
  const integral = etat.statut === "PAYE";
  const modeleAvis = emailAvis(a);
  const modeleQuittance = emailQuittance(a, integral);
  const smtp = mailConfigure();
  const ia = iaConfiguree();

  return (
    <>
      <PageHeader
        titre={`Loyer de ${formatPeriode(a.periode).toLowerCase()} — ${bail.lot.nom}`}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            <BadgeStatutAppel statut={etat.statut} />
            <span>{numeroAppel(a.id)} · <Link href={`/locataires/${bail.locataire.id}`} className="text-navy-800 hover:underline">{nomComplet(bail.locataire)}</Link> · <Link href={`/baux/${bail.id}`} className="text-navy-800 hover:underline">bail {TYPES_BAIL_COURT[bail.type].toLowerCase()}</Link></span>
          </span>
        }
        retour={{ href: "/loyers", libelle: "Loyers et quittances" }}
      />
      <Flash sp={sp} />

      <div className="space-y-6">
        <Card>
          <CardHeader titre="Échéance" />
          <CardBody>
            <Infos
              colonnes={3}
              items={[
                { label: "Logement", valeur: <span>{bail.lot.nom}<span className="block text-xs text-slate-500">{adresseSurUneLigne(bail.lot)}</span></span> },
                { label: "Période", valeur: `${formatDate(a.debutPeriode)} → ${formatDate(a.finPeriode)}${a.prorata ? " (prorata)" : ""}` },
                { label: "Date d'échéance", valeur: formatDate(a.dateEcheance) },
                { label: "Loyer hors charges", valeur: formatEuros(a.loyer) },
                { label: bail.chargesForfait ? "Forfait de charges" : "Provision sur charges", valeur: formatEuros(a.charges) },
                { label: "Total appelé", valeur: <strong>{formatEuros(a.total)}</strong> },
                { label: "Réglé", valeur: formatEuros(etat.regle) },
                { label: "Reste dû", valeur: <span className={etat.reste > 0 ? "font-semibold text-red-700" : ""}>{formatEuros(etat.reste)}</span> },
                { label: "Émis le", valeur: formatDate(a.dateEmission) },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            titre="Avis d'échéance"
            description={a.dateEnvoiAvis ? `Envoyé le ${formatDateHeure(a.dateEnvoiAvis)}.` : "Pas encore envoyé au locataire."}
            actions={
              <>
                <ButtonLink href={`/api/loyers/${a.id}/avis.pdf`} taille="sm" variante="secondary" target="_blank">Voir le PDF</ButtonLink>
                <ButtonLink href={`/api/loyers/${a.id}/avis.pdf?dl=1`} taille="sm" variante="secondary">Télécharger</ButtonLink>
                <form action={marquerAvisEnvoye}><input type="hidden" name="id" value={a.id} /><Button type="submit" taille="sm" variante="ghost">{a.dateEnvoiAvis ? "Marquer non envoyé" : "Marquer envoyé (courrier / main propre)"}</Button></form>
              </>
            }
          />
          <CardBody>
            <EnvoiEmail
              action={envoyerAvis.bind(null, a.id)}
              actionIA={genererEmail.bind(null, bail.id)}
              destinataire={bail.locataire.email}
              objetDefaut={modeleAvis.objet}
              corpsDefaut={modeleAvis.corps}
              contexteIA={`Envoi de l'avis d'échéance ${numeroAppel(a.id)} pour ${formatPeriode(a.periode)} : ${formatEuros(a.total)} à payer avant le ${formatDate(a.dateEcheance)}.`}
              libelleBouton={a.dateEnvoiAvis ? "Renvoyer l'avis par email" : "Envoyer l'avis par email"}
              pieceJointe="l'avis d'échéance"
              mailConfigure={smtp}
              iaConfiguree={ia}
              ouvert={!a.dateEnvoiAvis}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader titre={`Paiements (${a.paiements.length})`} description={etat.reste > 0 ? `Reste dû : ${formatEuros(etat.reste)}` : "Échéance soldée."} />
          {a.paiements.length > 0 && (
            <Tableau>
              <thead className="bg-slate-50"><tr><Th>Date</Th><Th>Mode</Th><Th>Référence</Th><Th droite>Montant</Th><Th /></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {a.paiements.map((p) => (
                  <tr key={p.id}>
                    <Td>{formatDate(p.date)}</Td>
                    <Td>{MODES_PAIEMENT[p.mode]}</Td>
                    <Td>{p.reference ?? "—"}</Td>
                    <Td droite>{formatEuros(p.montant)}</Td>
                    <Td droite>
                      <ConfirmForm action={supprimerPaiement} message="Supprimer ce paiement ?">
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" taille="sm" variante="danger">Supprimer</Button>
                      </ConfirmForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Tableau>
          )}
          {etat.reste > 0 && (
            <CardBody className="border-t border-slate-100">
              <p className="mb-3 text-sm font-semibold text-navy-900">Enregistrer un paiement</p>
              <PaiementForm action={enregistrerPaiement.bind(null, a.id)} dateDefaut={toISODate(auj)} montantDefaut={montantPourSaisie(etat.reste)} proposerQuittance={smtp && !!bail.locataire.email} />
            </CardBody>
          )}
        </Card>

        <Card>
          <CardHeader
            titre={integral ? `Quittance ${numeroQuittance(a.id)}` : "Quittance"}
            description={
              a.paiements.length === 0
                ? "La quittance sera disponible dès qu'un paiement aura été enregistré."
                : integral
                  ? a.dateEnvoiQuittance
                    ? `Quittance envoyée le ${formatDateHeure(a.dateEnvoiQuittance)}.`
                    : "Échéance soldée : la quittance peut être envoyée au locataire."
                  : "Paiement partiel : un reçu est disponible (la quittance n'est délivrée qu'après paiement intégral)."
            }
            actions={
              a.paiements.length > 0 ? (
                <>
                  <ButtonLink href={`/api/loyers/${a.id}/quittance.pdf`} taille="sm" variante="secondary" target="_blank">{integral ? "Voir la quittance" : "Voir le reçu"}</ButtonLink>
                  <ButtonLink href={`/api/loyers/${a.id}/quittance.pdf?dl=1`} taille="sm" variante="secondary">Télécharger</ButtonLink>
                  {integral && <form action={marquerQuittanceEnvoyee}><input type="hidden" name="id" value={a.id} /><Button type="submit" taille="sm" variante="ghost">{a.dateEnvoiQuittance ? "Marquer non envoyée" : "Marquer remise"}</Button></form>}
                </>
              ) : undefined
            }
          />
          {a.paiements.length > 0 && (
            <CardBody>
              <EnvoiEmail
                action={envoyerQuittance.bind(null, a.id)}
                actionIA={genererEmail.bind(null, bail.id)}
                destinataire={bail.locataire.email}
                objetDefaut={modeleQuittance.objet}
                corpsDefaut={modeleQuittance.corps}
                contexteIA={`Envoi de la ${integral ? "quittance" : "reçu de paiement partiel"} pour ${formatPeriode(a.periode)} (${formatEuros(etat.regle)} reçus).`}
                libelleBouton={integral ? (a.dateEnvoiQuittance ? "Renvoyer la quittance par email" : "Envoyer la quittance par email") : "Envoyer le reçu par email"}
                pieceJointe={integral ? "la quittance" : "le reçu"}
                mailConfigure={smtp}
                iaConfiguree={ia}
                ouvert={integral && !a.dateEnvoiQuittance}
              />
            </CardBody>
          )}
        </Card>
        {etat.statut === "EN_RETARD" && (
          <p className="text-sm text-slate-600">
            Échéance en retard : vous pouvez <Link href={`/baux/${bail.id}/courriers/nouveau?type=RELANCE`} className="font-medium text-navy-800 underline">rédiger une relance</Link> (avec l'assistant IA si configuré).
          </p>
        )}
        <Badge ton="gris">Dernière mise à jour : {formatDateHeure(new Date())}</Badge>
      </div>
    </>
  );
}

// Durée maximale d'exécution sur Vercel (rédaction IA, OCR, envois d'emails).
export const maxDuration = 300;
