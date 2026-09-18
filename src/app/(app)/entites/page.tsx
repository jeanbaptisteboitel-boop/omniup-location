import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { TYPES_ENTITE } from "@/lib/libelles";
import { avecMessage } from "@/lib/erreurs";
import { entiteCouranteId, multiEntitesActif } from "@/lib/entite";
import { activerMultiEntites, changerEntite, creerEntite, desactiverMultiEntites, supprimerEntite } from "@/actions/entites";
import { Badge, Button, ButtonLink, Card, PageHeader } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { EntiteForm } from "@/components/entites/entite-form";

export const metadata = { title: "Entités" };

/** Initiales d'une entité (deux premiers mots). */
function initiales(nom: string): string {
  const mots = nom.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m));
  return (
    mots
      .slice(0, 2)
      .map((m) => m.replace(/[^\p{L}\p{N}]/gu, "").charAt(0))
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function EntitesPage({ searchParams }: { searchParams: SearchParams }) {
  const multi = await multiEntitesActif();
  if (!multi) redirect(avecMessage("/parametres", "La gestion multi-entités n'est pas activée.", "erreur"));
  const sp = await searchParams;
  const [entites, couranteId] = await Promise.all([
    prisma.entite.findMany({ orderBy: { nom: "asc" }, include: { _count: { select: { bailleurs: true, lots: true, locataires: true, baux: true } } } }),
    entiteCouranteId(),
  ]);
  return (
    <>
      <PageHeader titre="Entités" sousTitre="Personnes et sociétés dont vous gérez les biens. Chaque entité a ses lots, baux, loyers et sa synthèse." actions={<ButtonLink href="#nouvelle-entite">Nouvelle entité</ButtonLink>} />
      <Flash sp={sp} />
      <div className="space-y-6">
        <div className={`flex items-center gap-4 rounded-xl border px-[18px] py-3.5 text-sm ${multi ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-navy-200 bg-navy-50 text-navy-800"}`}>
          <div className="flex-1">
            <p className="font-bold">{multi ? "Mode multi-entités activé" : "Mode multi-entités désactivé"}</p>
            <p className="mt-1">{multi ? "Le sélecteur d'entité apparaît dans la barre latérale. Chaque entité dispose de ses propres données ; les modèles de documents restent communs." : "Activez-le pour gérer plusieurs personnes ou sociétés (SCI, indivision, clients d'un cabinet) depuis le même compte."}</p>
          </div>
          <form action={multi ? desactiverMultiEntites : activerMultiEntites}>
            <button
              type="submit"
              role="switch"
              aria-checked={multi}
              aria-label={multi ? "Désactiver le mode multi-entités" : "Activer le mode multi-entités"}
              title={multi ? "Revenir en entité unique" : "Activer le mode multi-entités"}
              className={`relative h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan ${multi ? "bg-brand-cyan" : "bg-slate-300"}`}
            >
              <span aria-hidden="true" className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${multi ? "left-[23px]" : "left-[3px]"}`} />
            </button>
          </form>
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {entites.map((e) => {
            const courante = e.id === couranteId;
            const vide = e._count.bailleurs + e._count.lots + e._count.locataires + e._count.baux === 0;
            const societe = e.type === "SOCIETE";
            return (
              <div key={e.id} className={`rounded-xl border bg-white px-5 py-[18px] shadow-card ${courante ? "border-brand-cyan ring-1 ring-brand-cyan" : "border-slate-200"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden="true" className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-[13px] font-bold ${societe ? "bg-navy-100 text-navy-800" : "bg-navy-50 text-navy-500"}`}>
                      {initiales(e.nom)}
                    </span>
                    <div className="min-w-0">
                      <strong className="block break-words text-[15px] font-bold text-navy-900">{e.nom}</strong>
                      <span className="text-xs text-slate-500">{TYPES_ENTITE[e.type]}</span>
                    </div>
                  </div>
                  {courante && <Badge ton="cyan">Entité de travail</Badge>}
                </div>
                <p className="mt-3.5 text-[13px] text-slate-600">
                  {e._count.lots} {e._count.lots > 1 ? "lots gérés" : "lot géré"}
                  {e._count.lots === 0 ? " · aucun bien pour le moment" : ` · ${e._count.baux} ${e._count.baux > 1 ? "baux" : "bail"} · ${e._count.locataires} ${e._count.locataires > 1 ? "locataires" : "locataire"}`}
                </p>
                {e.notes && <p className="mt-1 text-[13px] text-slate-500">{e.notes}</p>}
                <div className="mt-3.5 flex flex-wrap gap-2 border-t border-slate-100 pt-3.5">
                  {!courante && (
                    <form action={changerEntite}>
                      <input type="hidden" name="entiteId" value={e.id} />
                      <input type="hidden" name="retour" value="/" />
                      <Button type="submit" taille="sm">Travailler sur cette entité</Button>
                    </form>
                  )}
                  <ButtonLink href={`/entites/${e.id}/modifier`} taille="sm" variante="secondary">Modifier</ButtonLink>
                  {vide && entites.length > 1 && (
                    <ConfirmForm action={supprimerEntite} titre="Supprimer cette entité ?" message={`L'entité « ${e.nom} » sera supprimée. Cette action est irréversible.`} libelleConfirmer="Supprimer définitivement">
                      <input type="hidden" name="id" value={e.id} />
                      <Button type="submit" taille="sm" variante="danger">Supprimer</Button>
                    </ConfirmForm>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div id="nouvelle-entite" className="scroll-mt-6">
          <Card className="max-w-[480px]">
            <EntiteForm action={creerEntite} initial={{ type: "SOCIETE" }} libelle="Créer l'entité" modale={{ titre: "Nouvelle entité" }} />
          </Card>
        </div>
      </div>
    </>
  );
}
