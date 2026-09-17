import { iaConfiguree } from "@/lib/ia-config";
import { entiteCourante } from "@/lib/entite";
import { enregistrerReponseAssistant } from "@/actions/assistant";
import { Chat } from "@/components/assistant/chat";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Assistant IA" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const entite = await entiteCourante();
  return (
    <>
      <PageHeader titre="Assistant IA" sousTitre={`Conseils de gestion locative et rédaction de tout courrier, avec la connaissance des lots, locataires et loyers de « ${entite.nom} ». Les conseils juridiques sont à confirmer pour les situations litigieuses.`} />
      <Chat configuree={iaConfiguree()} actionEnregistrer={enregistrerReponseAssistant} />
    </>
  );
}
