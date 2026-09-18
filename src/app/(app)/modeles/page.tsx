import Link from "next/link";
import type { CategorieModele } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { entierParam, texteParam, type SearchParams } from "@/lib/params";
import { CATEGORIES_MODELE } from "@/lib/libelles";
import { initialiserModelesDefaut } from "@/lib/modeles-data";
import { dupliquerModele, reinitialiserModele } from "@/actions/modeles";
import { Badge, ButtonLink, Card, EmptyState, Filtres, PageHeader, Segments } from "@/components/ui";
import { Input } from "@/components/form";
import { IconeBail } from "@/components/icones";
import { ConfirmForm } from "@/components/confirm-form";
import { FiltresForm } from "@/components/filtres-form";
import { Flash } from "@/components/flash";
import { normaliser, statutModele } from "@/components/modeles/statut-modele";

export const metadata = { title: "Modèles de documents" };

const ORDRE: CategorieModele[] = ["BAIL", "AVENANT", "RENOUVELLEMENT", "RESILIATION", "CAUTION", "CONVENTION", "AUTRE"];

/** Petits boutons d'action d'une ligne de la bibliothèque (32 px). */
const PETIT = "inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan";
const PETIT_PRINCIPAL = "inline-flex h-8 cursor-pointer items-center whitespace-nowrap rounded-md bg-navy-50 px-2.5 text-[13px] font-semibold text-navy-800 transition-colors hover:bg-navy-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan";

export default async function ModelesPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  await initialiserModelesDefaut();
  const bailId = entierParam(sp, "bailId");
  const q = texteParam(sp, "q");
  const statutParam = texteParam(sp, "statut");
  const statut = statutParam === "defaut" || statutParam === "perso" ? statutParam : null;
  const modeles = (await prisma.modeleDocument.findMany({ orderBy: [{ categorie: "asc" }, { parDefaut: "desc" }, { nom: "asc" }] })).map((m) => ({ ...m, ...statutModele(m) }));
  const nbPerso = modeles.filter((m) => m.perso).length;
  const recherche = q ? normaliser(q) : "";
  const visibles = modeles.filter((m) => (!recherche || normaliser(m.nom).includes(recherche)) && (statut === "defaut" ? !m.perso : statut === "perso" ? m.perso : true));
  const suffixe = bailId ? `?bailId=${bailId}` : "";
  const lien = (s: string | null) => {
    const p = new URLSearchParams();
    if (bailId) p.set("bailId", String(bailId));
    if (q) p.set("q", q);
    if (s) p.set("statut", s);
    const chaine = p.toString();
    return `/modeles${chaine ? `?${chaine}` : ""}`;
  };
  return (
    <>
      <PageHeader
        titre="Modèles de documents"
        sousTitre={bailId ? "Choisissez le modèle à générer pour ce bail : ses variables seront remplies automatiquement." : `${modeles.length} modèles · ${nbPerso} ${nbPerso > 1 ? "personnalisés" : "personnalisé"}`}
        actions={<ButtonLink href="/modeles/nouveau">Nouveau modèle</ButtonLink>}
        retour={bailId ? { href: `/baux/${bailId}`, libelle: "Bail" } : undefined}
      />
      <Flash sp={sp} />
      <Filtres>
        <FiltresForm>
          {bailId && <input type="hidden" name="bailId" value={bailId} />}
          {statut && <input type="hidden" name="statut" value={statut} />}
          <Input name="q" type="search" defaultValue={q ?? ""} placeholder="Rechercher un modèle…" aria-label="Rechercher" className="min-w-[280px]" />
        </FiltresForm>
        <Segments
          items={[
            { href: lien(null), libelle: "Tous", actif: statut === null },
            { href: lien("defaut"), libelle: "Par défaut", actif: statut === "defaut" },
            { href: lien("perso"), libelle: "Personnalisé", actif: statut === "perso" },
          ]}
        />
      </Filtres>
      {visibles.length === 0 ? (
        <EmptyState
          titre="Aucun modèle"
          description={q ? `Aucun modèle ne correspond à « ${q} ».` : statut === "perso" ? "Aucun modèle personnalisé pour le moment : modifiez un modèle fourni par défaut ou créez le vôtre." : "Aucun modèle ne correspond à ce filtre."}
          action={<ButtonLink href="/modeles/nouveau">Nouveau modèle</ButtonLink>}
        />
      ) : (
        <div className="space-y-6">
          {ORDRE.map((c) => {
            const liste = visibles.filter((m) => m.categorie === c);
            if (liste.length === 0) return null;
            return (
              <Card key={c}>
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
                  <h2 className="text-[15px] font-bold text-navy-900">{CATEGORIES_MODELE[c]}</h2>
                  <span className="shrink-0 text-xs text-slate-500">
                    {liste.length} {liste.length > 1 ? "modèles" : "modèle"}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {liste.map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5 hover:bg-slate-50">
                      <IconeBail className="shrink-0 text-slate-500" />
                      <Link href={`/modeles/${m.id}`} title={m.description ?? undefined} className="min-w-[200px] flex-1 text-sm font-semibold text-navy-900 hover:text-brand-cyan-dark">
                        {m.nom}
                      </Link>
                      <Badge ton={m.perso ? "bleu" : "gris"}>{m.perso ? "Personnalisé" : "Par défaut"}</Badge>
                      <span className="flex flex-wrap gap-1">
                        <Link href={`/modeles/${m.id}/generer${suffixe}`} className={PETIT_PRINCIPAL}>Générer</Link>
                        <form action={dupliquerModele}>
                          <input type="hidden" name="id" value={m.id} />
                          <button type="submit" className={PETIT}>Dupliquer</button>
                        </form>
                        <Link href={`/modeles/${m.id}`} className={PETIT}>Modifier</Link>
                        {m.reinitialisable && (
                          <ConfirmForm action={reinitialiserModele} titre="Réinitialiser ce modèle ?" message={`« ${m.nom} » reprendra sa version d'origine : vos modifications seront perdues.`} libelleConfirmer="Réinitialiser">
                            <input type="hidden" name="id" value={m.id} />
                            <button type="submit" className={PETIT}>Réinitialiser</button>
                          </ConfirmForm>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
