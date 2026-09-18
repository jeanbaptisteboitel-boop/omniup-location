import { iaConfiguree } from "@/lib/ia-config";
import { entiteCourante } from "@/lib/entite";
import { enregistrerReponseAssistant } from "@/actions/assistant";
import { Chat } from "@/components/assistant/chat";
import { PageHeader, Pastille } from "@/components/ui";

export const metadata = { title: "Assistant IA" };
export const dynamic = "force-dynamic";

export default async function AssistantPage() {
  const entite = await entiteCourante();
  return (
    <>
      <PageHeader
        titre="Assistant IA"
        sousTitre="Rédaction de courriers, questions juridiques et calculs sur votre patrimoine."
        actions={
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-600">
            <Pastille ton="cyan" />
            <span>
              Entité de travail : <strong className="font-bold text-navy-900">{entite.nom}</strong>
            </span>
          </div>
        }
      />
      <Chat configuree={iaConfiguree()} actionEnregistrer={enregistrerReponseAssistant} />
    </>
  );
}
