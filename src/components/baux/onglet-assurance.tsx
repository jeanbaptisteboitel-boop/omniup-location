import type { AttestationAssurance, Locataire } from "@prisma/client";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatTaille } from "@/lib/storage";
import { nomComplet } from "@/lib/libelles";
import { LIBELLES_ASSURANCE, TONS_ASSURANCE, etatAssurance } from "@/lib/assurances";
import { demanderAssurance, enregistrerAttestation, preparerEnvoiAttestation, supprimerAttestation } from "@/actions/assurances";
import { Alerte, Badge, Button, Tableau, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { AttestationForm } from "@/components/baux/attestation-form";

/** Onglet « Assurance » de la fiche du bail : attestations reçues, état de la couverture et demandes au locataire. */
export function OngletAssurance({
  bailId,
  attestations,
  locataires,
  assuranceDemandeeLe,
  assuranceRelanceLe,
  mailConfigure,
  bailEnCours,
}: {
  bailId: number;
  attestations: (AttestationAssurance & { locataire: Locataire | null })[];
  locataires: Locataire[];
  assuranceDemandeeLe: Date | null;
  assuranceRelanceLe: Date | null;
  mailConfigure: boolean;
  bailEnCours: boolean;
}) {
  const etat = etatAssurance(attestations, aujourdhui());
  const sansEmail = locataires.every((l) => !l.email);
  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Badge ton={TONS_ASSURANCE[etat.statut]}>{LIBELLES_ASSURANCE[etat.statut]}</Badge>
        <span className="text-sm text-slate-600">
          {etat.echeance
            ? etat.jours !== null && etat.jours >= 0
              ? `Logement assuré jusqu'au ${formatDate(etat.echeance)} (${etat.jours} jour${etat.jours > 1 ? "s" : ""}).`
              : `Couverture expirée depuis le ${formatDate(etat.echeance)}.`
            : "Aucune attestation d'assurance habitation n'a été reçue pour ce bail."}
        </span>
      </div>

      {etat.statut !== "A_JOUR" && bailEnCours && (
        <Alerte ton={etat.statut === "BIENTOT_EXPIREE" ? "orange" : "rouge"}>
          Le locataire doit justifier chaque année d'une assurance contre les risques locatifs (article 7 g de la loi du 6 juillet 1989). La demande est relancée automatiquement chaque semaine par email tant que l'attestation n'est pas déposée.
        </Alerte>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <form action={demanderAssurance}>
          <input type="hidden" name="id" value={bailId} />
          <Button type="submit" variante="secondary" disabled={!mailConfigure || sansEmail}>Demander l'attestation par email</Button>
        </form>
        <span className="text-xs text-slate-500">
          {!mailConfigure
            ? "Envoi d'emails non configuré (voir Paramètres)."
            : sansEmail
              ? "Aucun locataire n'a d'adresse email."
              : assuranceRelanceLe
                ? `Dernière demande le ${formatDate(assuranceRelanceLe)}${assuranceDemandeeLe && assuranceDemandeeLe.getTime() !== assuranceRelanceLe.getTime() ? ` (première le ${formatDate(assuranceDemandeeLe)})` : ""}.`
                : "Aucune demande envoyée pour l'instant."}
        </span>
      </div>

      {attestations.length > 0 && (
        <Tableau>
          <thead className="bg-slate-50">
            <tr>
              <Th>Échéance</Th>
              <Th>Compagnie</Th>
              <Th>Contrat</Th>
              <Th>Origine</Th>
              <Th>Justificatif</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {attestations.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50">
                <Td className="whitespace-nowrap font-semibold text-navy-900">{formatDate(a.dateEcheance)}</Td>
                <Td>{a.compagnie ?? <span className="text-slate-400">—</span>}</Td>
                <Td>{a.numeroPolice ?? <span className="text-slate-400">—</span>}</Td>
                <Td className="text-[13px] text-slate-500">{a.deposeParLocataire ? `Déposée par ${a.locataire ? nomComplet(a.locataire) : "le locataire"} le ${formatDate(a.createdAt)}` : `Saisie le ${formatDate(a.createdAt)}`}</Td>
                <Td>
                  {a.chemin ? (
                    <a href={`/api/baux/${bailId}/assurance/${a.id}`} target="_blank" rel="noopener" className="font-semibold text-navy-800 hover:underline">
                      {a.nomFichier ?? "Attestation"} <span className="font-normal text-slate-500">({formatTaille(a.taille ?? 0)})</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">Aucun fichier</span>
                  )}
                </Td>
                <Td droite>
                  <ConfirmForm action={supprimerAttestation} titre="Supprimer cette attestation ?" message="L'attestation et son justificatif seront supprimés." libelleConfirmer="Supprimer">
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variante="ghost" taille="sm">Supprimer</Button>
                  </ConfirmForm>
                </Td>
              </tr>
            ))}
          </tbody>
        </Tableau>
      )}

      <div className="border-t border-slate-100 pt-5">
        <h3 className="mb-2 text-sm font-bold text-navy-900">Enregistrer une attestation</h3>
        <AttestationForm action={enregistrerAttestation.bind(null, bailId)} preparer={preparerEnvoiAttestation.bind(null, bailId)} />
      </div>
    </div>
  );
}
