import Link from "next/link";
import type { StatutCandidature } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { entiteCouranteId } from "@/lib/entite";
import { apprecierTauxEffort, aPurger, loyerCharges, nomDossier, revenuTotal, STATUTS_CANDIDATURE, tauxEffort, TONS_CANDIDATURE } from "@/lib/candidatures";
import { options } from "@/lib/libelles";
import { aujourdhui, formatDate } from "@/lib/dates";
import { formatEuros, formatNombre } from "@/lib/montants";
import { Alerte, Badge, ButtonLink, Card, EmptyState, Filtres, PageHeader, Stat, Tableau, Td, Th } from "@/components/ui";
import { Select } from "@/components/form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";

export const metadata = { title: "Candidatures" };
export const dynamic = "force-dynamic";

const STATUTS = Object.keys(STATUTS_CANDIDATURE) as StatutCandidature[];

export default async function CandidaturesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const statutParam = texteParam(sp, "statut") as StatutCandidature | null;
  const statut = statutParam && STATUTS.includes(statutParam) ? statutParam : null;
  const lotId = entierParam(sp, "lotId");
  const entiteId = await entiteCouranteId();

  const [candidatures, lots] = await Promise.all([
    prisma.candidature.findMany({
      where: { entiteId, ...(statut ? { statut } : {}), ...(lotId ? { lotId } : {}) },
      include: { lot: true, dossiers: { where: { role: "CANDIDAT" }, orderBy: { createdAt: "asc" } } },
      orderBy: [{ createdAt: "desc" }],
    }),
    prisma.lot.findMany({ where: { entiteId }, select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
  ]);

  const auj = aujourdhui();
  const aEtudier = candidatures.filter((c) => c.statut === "DEPOSEE").length;
  const enCours = candidatures.filter((c) => c.statut === "TRANSMISE" || c.statut === "BROUILLON").length;
  const retenues = candidatures.filter((c) => c.statut === "ACCEPTEE").length;
  const purger = candidatures.filter((c) => aPurger(c, auj)).length;
  const filtre = statut || lotId;

  return (
    <>
      <PageHeader
        titre="Candidatures"
        sousTitre="Dossiers des candidats à la location : informations, justificatifs et cautions."
        actions={<ButtonLink href="/candidatures/nouvelle">Nouvelle candidature</ButtonLink>}
      />
      <Flash sp={sp} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Stat libelle="À étudier" valeur={String(aEtudier)} detail="dossiers remis par les candidats" ton={aEtudier > 0 ? "cyan" : "gris"} />
        <Stat libelle="En cours de constitution" valeur={String(enCours)} detail="le candidat complète son dossier" ton="bleu" />
        <Stat libelle="Retenues" valeur={String(retenues)} detail="en attente du bail" ton="vert" />
        <Stat libelle="À détruire" valeur={String(purger)} detail="dossiers non retenus de plus de 3 mois" ton={purger > 0 ? "orange" : "gris"} />
      </div>

      {purger > 0 && (
        <Alerte ton="orange" titre="Dossiers à détruire" className="mt-5">
          {purger} dossier(s) non retenu(s) datent de plus de trois mois : supprimez-les pour respecter la durée de conservation des données des candidats.
        </Alerte>
      )}

      <Filtres className="mt-6">
        <FiltresForm>
          <div className="w-[220px] max-w-full">
            <Select name="statut" aria-label="Statut" vide="Tous les statuts" options={options(STATUTS_CANDIDATURE)} defaultValue={statut ?? ""} />
          </div>
          <div className="w-[220px] max-w-full">
            <Select name="lotId" aria-label="Logement" vide="Tous les logements" options={lots.map((l) => ({ value: String(l.id), label: l.nom }))} defaultValue={lotId ? String(lotId) : ""} />
          </div>
          {filtre && (
            <Link href="/candidatures" className="text-[13px] text-slate-500 hover:text-navy-800">
              Réinitialiser
            </Link>
          )}
        </FiltresForm>
      </Filtres>

      <Card className="mt-5">
        {candidatures.length === 0 ? (
          <EmptyState
            titre={filtre ? "Aucune candidature pour ce filtre" : "Aucune candidature"}
            description={filtre ? "Modifiez les filtres pour élargir la recherche." : "Ouvrez une candidature : le candidat reçoit un lien pour compléter son dossier et déposer ses justificatifs."}
            action={!filtre ? <ButtonLink href="/candidatures/nouvelle">Nouvelle candidature</ButtonLink> : undefined}
          />
        ) : (
          <Tableau>
            <thead className="bg-slate-50">
              <tr>
                <Th>Candidat</Th>
                <Th>Logement</Th>
                <Th droite>Loyer CC</Th>
                <Th droite>Revenus</Th>
                <Th>Taux d&apos;effort</Th>
                <Th>Statut</Th>
                <Th>Déposée le</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {candidatures.map((c) => {
                const loyerCC = loyerCharges(c);
                const revenus = c.dossiers.reduce((s, d) => s + revenuTotal(d), 0);
                const taux = tauxEffort(revenus, loyerCC);
                const appreciation = apprecierTauxEffort(taux);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <Link href={`/candidatures/${c.id}`} className="font-semibold text-navy-900 underline-offset-2 hover:underline">
                        {c.dossiers.map(nomDossier).join(", ") || "Candidat"}
                      </Link>
                      {c.dossiers.length > 1 && <span className="ml-1.5 text-xs text-slate-500">colocation</span>}
                    </Td>
                    <Td className="text-slate-600">{c.lot?.nom ?? "—"}</Td>
                    <Td droite className="tabular-nums">{loyerCC > 0 ? formatEuros(loyerCC) : "—"}</Td>
                    <Td droite className="tabular-nums">{revenus > 0 ? formatEuros(revenus) : "—"}</Td>
                    <Td>{taux !== null && appreciation ? <Badge ton={appreciation.ton === "vert" ? "vert" : appreciation.ton === "orange" ? "orange" : "rouge"}>{formatNombre(taux, 1)} %</Badge> : <span className="text-slate-400">—</span>}</Td>
                    <Td><Badge ton={TONS_CANDIDATURE[c.statut]}>{STATUTS_CANDIDATURE[c.statut]}</Badge></Td>
                    <Td className="tabular-nums text-slate-600">{c.deposeLe ? formatDate(c.deposeLe) : "—"}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Tableau>
        )}
      </Card>
    </>
  );
}
