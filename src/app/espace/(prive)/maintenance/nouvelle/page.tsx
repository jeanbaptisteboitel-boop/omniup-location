import { exigerLocataire } from "@/lib/espace";
import { bauxPourDemande } from "@/lib/maintenance";
import { adresseSurUneLigne } from "@/lib/libelles";
import { deposerDemande, preparerPieceLocataire } from "@/actions/maintenance";
import { Alerte, Card, CardBody, PageHeader } from "@/components/ui";
import { DemandeForm } from "@/components/maintenance/demande-form";

export const metadata = { title: "Nouvelle demande" };
export const dynamic = "force-dynamic";

export default async function NouvelleDemandePage() {
  const l = await exigerLocataire();
  const baux = await bauxPourDemande(l.id);

  return (
    <>
      <PageHeader titre="Nouvelle demande" sousTitre="Décrivez le problème : votre bailleur est prévenu dès l'envoi." retour={{ href: "/espace/maintenance", libelle: "Mes demandes" }} />
      {baux.length === 0 ? (
        <Alerte ton="orange" titre="Aucun bail en cours">
          Votre compte n'est rattaché à aucun bail en cours : les demandes d'intervention ne sont pas disponibles. Contactez directement votre bailleur.
        </Alerte>
      ) : (
        <Card className="max-w-3xl">
          <CardBody>
            <DemandeForm
              action={deposerDemande}
              preparer={preparerPieceLocataire}
              baux={baux.map((b) => ({ id: b.id, libelle: `${b.lot.nom} — ${adresseSurUneLigne(b.lot)}` }))}
              annulerHref="/espace/maintenance"
            />
          </CardBody>
        </Card>
      )}
    </>
  );
}
