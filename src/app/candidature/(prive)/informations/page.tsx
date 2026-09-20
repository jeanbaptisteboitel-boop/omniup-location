import { redirect } from "next/navigation";
import type { SearchParams } from "@/lib/params";
import { dossierModifiable, exigerDossier } from "@/lib/candidat";
import { enregistrerInformations } from "@/actions/candidat";
import { Alerte, Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { InformationsForm } from "@/components/candidatures/informations-form";

export const metadata = { title: "Mes informations" };
export const dynamic = "force-dynamic";

export default async function InformationsPage({ searchParams }: { searchParams: SearchParams }) {
  const d = await exigerDossier();
  if (!dossierModifiable(d.candidature.statut)) redirect("/candidature");
  const sp = await searchParams;
  return (
    <>
      <PageHeader
        titre="Mes informations"
        sousTitre={d.role === "GARANT" ? "Informations de la caution" : "Elles déterminent les justificatifs qui vous seront demandés."}
        retour={{ href: "/candidature", libelle: "Mon dossier" }}
      />
      <Flash sp={sp} />
      {d.complet && (
        <Alerte ton="bleu" className="mb-5">
          Votre dossier est validé. Toute modification le repasse à compléter : pensez à le valider de nouveau depuis « Mon dossier ».
        </Alerte>
      )}
      <Card className="max-w-[760px]">
        <CardHeader titre="Votre dossier" description="Ces informations ne sont visibles que du bailleur et de son gestionnaire." />
        <CardBody>
          <InformationsForm action={enregistrerInformations} dossier={d} />
        </CardBody>
      </Card>
    </>
  );
}
