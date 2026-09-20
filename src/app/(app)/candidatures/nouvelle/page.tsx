import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { entiteCouranteId } from "@/lib/entite";
import { PIECES_INTERDITES } from "@/lib/candidatures";
import { creerCandidature } from "@/actions/candidatures";
import { Card, CardBody, CardHeader, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { CandidatureForm } from "@/components/candidatures/candidature-form";

export const metadata = { title: "Nouvelle candidature" };
export const dynamic = "force-dynamic";

export default async function NouvelleCandidaturePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const lots = await prisma.lot.findMany({
    where: { entiteId: await entiteCouranteId() },
    select: { id: true, nom: true, loyerIndicatif: true, chargesIndicatives: true },
    orderBy: { nom: "asc" },
  });
  return (
    <>
      <PageHeader titre="Nouvelle candidature" sousTitre="Le candidat reçoit un lien personnel pour compléter son dossier et déposer ses justificatifs." retour={{ href: "/candidatures", libelle: "Candidatures" }} />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader titre="Candidature" />
          <CardBody>
            <CandidatureForm action={creerCandidature} lots={lots} creation />
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader titre="Pièces interdites" description="Article 22-2 de la loi du 6 juillet 1989 : les réclamer expose à une amende administrative de 3 000 € (personne physique) ou 15 000 € (personne morale)." />
          <CardBody>
            <ul className="flex flex-col gap-1.5 text-[13px] text-slate-600">
              {PIECES_INTERDITES.map((p) => (
                <li key={p} className="flex gap-2">
                  <span aria-hidden className="text-red-500">✕</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
