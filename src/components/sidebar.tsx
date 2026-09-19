import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "./nav-link";
import { MobileNav } from "./mobile-nav";
import { Marque } from "./logomark";
import { IconeBail, IconeBailleur, IconeCalculatrice, IconeDepenses, IconeDocuments, IconeEmprunts, IconeEntites, IconeEuro, IconeIA, IconeImmeuble, IconeLocataires, IconeLot, IconeModeles, IconeParametres, IconeSynthese, IconeTableauDeBord, IconeIndices } from "./icones";
import { protectionActive } from "@/lib/session";
import { seDeconnecter } from "@/actions/session";
import { entiteCourante, listeEntites, multiEntitesActif } from "@/lib/entite";
import { changerEntite } from "@/actions/entites";
import { EntiteSwitcher } from "./entites/entite-switcher";

type Lien = { href: string; libelle: string; icone: ReactNode };

const GROUPES: { titre: string | null; liens: Lien[] }[] = [
  { titre: null, liens: [{ href: "/", libelle: "Tableau de bord", icone: <IconeTableauDeBord /> }] },
  {
    titre: "Patrimoine",
    liens: [
      { href: "/bailleurs", libelle: "Bailleurs", icone: <IconeBailleur /> },
      { href: "/immeubles", libelle: "Immeubles", icone: <IconeImmeuble /> },
      { href: "/lots", libelle: "Lots", icone: <IconeLot /> },
    ],
  },
  {
    titre: "Location",
    liens: [
      { href: "/locataires", libelle: "Locataires", icone: <IconeLocataires /> },
      { href: "/baux", libelle: "Baux", icone: <IconeBail /> },
      { href: "/loyers", libelle: "Loyers et quittances", icone: <IconeEuro /> },
      { href: "/documents", libelle: "Documents", icone: <IconeDocuments /> },
      { href: "/modeles", libelle: "Modèles de documents", icone: <IconeModeles /> },
    ],
  },
  {
    titre: "Comptabilité",
    liens: [
      { href: "/depenses", libelle: "Dépenses", icone: <IconeDepenses /> },
      { href: "/emprunts", libelle: "Emprunts", icone: <IconeEmprunts /> },
      { href: "/synthese", libelle: "Synthèse annuelle", icone: <IconeSynthese /> },
    ],
  },
  {
    titre: "Outils",
    liens: [
      { href: "/outils", libelle: "Calculatrices", icone: <IconeCalculatrice /> },
      { href: "/assistant", libelle: "Assistant IA", icone: <IconeIA /> },
      { href: "/indices", libelle: "Indices INSEE", icone: <IconeIndices /> },
    ],
  },
];

function Deconnexion() {
  if (!protectionActive()) return null;
  return (
    <form action={seDeconnecter}>
      <button type="submit" className="cursor-pointer py-1.5 text-[11px] text-navy-300 hover:text-white">Déconnexion</button>
    </form>
  );
}

async function PanneauNav({ multi }: { multi: boolean }) {
  const entite = await entiteCourante();
  const entites = multi ? await listeEntites() : [];
  const groupes = [...GROUPES, { titre: null, liens: [...(multi ? [{ href: "/entites", libelle: "Entités", icone: <IconeEntites /> }] : []), { href: "/parametres", libelle: "Paramètres", icone: <IconeParametres /> }] }];
  return (
    <div className="flex h-full min-h-screen w-[260px] flex-col bg-navy-900 px-3 py-4 text-white">
      <Link href="/" className="flex items-center gap-3 px-2.5 py-1.5 text-white">
        <Marque />
      </Link>
      {multi ? (
        <EntiteSwitcher entites={entites.map((e) => ({ id: e.id, nom: e.nom }))} couranteId={entite.id} action={changerEntite} />
      ) : (
        <Link href="/parametres" className="mx-2.5 mt-3 block truncate text-xs text-navy-300 hover:text-white" title="Nom de l'entité (modifiable dans Paramètres)">
          {entite.nom}
        </Link>
      )}
      <nav className="mt-5 flex flex-1 flex-col gap-[18px] overflow-y-auto">
        {groupes.map((g, i) => (
          <div key={i}>
            {g.titre && <p className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-[.12em] text-navy-300">{g.titre}</p>}
            <ul className="flex flex-col gap-0.5">
              {g.liens.map((l) => (
                <li key={l.href}>
                  <NavLink href={l.href} icone={l.icone}>
                    {l.libelle}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mt-3 flex items-center justify-between border-t border-white/8 px-2.5 pt-2.5">
        <p className="text-[11px] text-navy-300">Gestion locative · v0.4</p>
        <Deconnexion />
      </div>
    </div>
  );
}

export async function Sidebar() {
  const multi = await multiEntitesActif();
  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 lg:block">
        <PanneauNav multi={multi} />
      </aside>
      <MobileNav>
        <PanneauNav multi={multi} />
      </MobileNav>
    </>
  );
}
