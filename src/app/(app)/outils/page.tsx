import { texteParam, type SearchParams } from "@/lib/params";
import { Calculatrices } from "@/components/outils/calculatrices";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Calculatrices" };

export default async function OutilsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <>
      <PageHeader titre="Calculatrices" sousTitre="Pourcentages de loyer, révision par indice, rentabilité, frais de notaire, capacité d'emprunt, mensualités et prêt in fine. Les résultats sont des estimations indicatives." />
      <Calculatrices initial={texteParam(sp, "onglet") ?? undefined} />
    </>
  );
}
