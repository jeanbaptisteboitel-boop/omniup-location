import Link from "next/link";
import { NavLink } from "./nav-link";
import { protectionActive } from "@/lib/session";
import { seDeconnecter } from "@/actions/session";
import { entiteCourante, listeEntites, multiEntitesActif } from "@/lib/entite";
import { changerEntite } from "@/actions/entites";
import { EntiteSwitcher } from "./entites/entite-switcher";

const GROUPES: { titre: string | null; liens: { href: string; libelle: string }[] }[] = [
  { titre: null, liens: [{ href: "/", libelle: "Tableau de bord" }] },
  {
    titre: "Patrimoine",
    liens: [
      { href: "/bailleurs", libelle: "Bailleurs" },
      { href: "/immeubles", libelle: "Immeubles" },
      { href: "/lots", libelle: "Lots" },
    ],
  },
  {
    titre: "Location",
    liens: [
      { href: "/locataires", libelle: "Locataires" },
      { href: "/baux", libelle: "Baux" },
      { href: "/loyers", libelle: "Loyers et quittances" },
      { href: "/documents", libelle: "Documents" },
      { href: "/modeles", libelle: "Modèles de documents" },
    ],
  },
  {
    titre: "Comptabilité",
    liens: [
      { href: "/depenses", libelle: "Dépenses" },
      { href: "/emprunts", libelle: "Emprunts" },
      { href: "/synthese", libelle: "Synthèse annuelle" },
    ],
  },
  {
    titre: "Outils",
    liens: [
      { href: "/outils", libelle: "Calculatrices" },
      { href: "/assistant", libelle: "Assistant IA" },
    ],
  },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 px-3 py-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-cyan text-lg font-black text-navy-950">⏻</span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-wide text-white">OMNIUP</span>
        <span className="block text-xs uppercase tracking-widest text-brand-cyan">Location</span>
      </span>
    </Link>
  );
}

function Menu({ multi }: { multi: boolean }) {
  const groupes = [...GROUPES, { titre: null, liens: [...(multi ? [{ href: "/entites", libelle: "Entités" }] : []), { href: "/parametres", libelle: "Paramètres" }] }];
  return (
    <nav className="space-y-5">
      {groupes.map((g, i) => (
        <div key={i}>
          {g.titre && <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-navy-300">{g.titre}</p>}
          <ul className="space-y-0.5">
            {g.liens.map((l) => (
              <li key={l.href}>
                <NavLink href={l.href}>{l.libelle}</NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

async function BlocEntite({ multi }: { multi: boolean }) {
  const entite = await entiteCourante();
  if (!multi) {
    return (
      <Link href="/parametres" className="block px-3 text-xs text-navy-200 hover:text-white" title="Nom de l'entité (modifiable dans Paramètres)">
        {entite.nom}
      </Link>
    );
  }
  const entites = await listeEntites();
  return <EntiteSwitcher entites={entites.map((e) => ({ id: e.id, nom: e.nom }))} couranteId={entite.id} action={changerEntite} />;
}

function Deconnexion({ className }: { className: string }) {
  if (!protectionActive()) return null;
  return (
    <form action={seDeconnecter} className={className}>
      <button type="submit" className="text-[11px] text-navy-300 hover:text-white">Déconnexion</button>
    </form>
  );
}

export async function Sidebar() {
  const multi = await multiEntitesActif();
  return (
    <>
      <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 px-3 py-4 lg:flex lg:sticky lg:top-0 lg:h-screen">
        <Logo />
        <div className="mt-2">
          <BlocEntite multi={multi} />
        </div>
        <div className="mt-5 flex-1 overflow-y-auto">
          <Menu multi={multi} />
        </div>
        <div className="flex items-center justify-between px-3">
          <p className="text-[11px] text-navy-300">Gestion locative · v0.3</p>
          <Deconnexion className="" />
        </div>
      </aside>
      <details className="bg-navy-900 px-3 py-2 lg:hidden">
        <summary className="flex cursor-pointer items-center justify-between">
          <Logo />
          <span className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white">Menu</span>
        </summary>
        <div className="space-y-4 pb-3 pt-2">
          <BlocEntite multi={multi} />
          <Menu multi={multi} />
          <Deconnexion className="px-3" />
        </div>
      </details>
    </>
  );
}
