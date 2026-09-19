import type { SearchParams } from "@/lib/params";
import { ROLES, exigerSession } from "@/lib/utilisateurs";
import { listeEntites } from "@/lib/entite";
import { changerMotDePasse } from "@/actions/utilisateurs";
import { Badge, Card, CardBody, CardHeader, Infos, PageHeader } from "@/components/ui";
import { Flash } from "@/components/flash";
import { ChangerMotDePasseForm } from "@/components/connexion-form";

export const metadata = { title: "Mon compte" };
export const dynamic = "force-dynamic";

export default async function ComptePage({ searchParams }: { searchParams: SearchParams }) {
  const session = await exigerSession();
  const sp = await searchParams;
  const entites = await listeEntites();
  return (
    <>
      <PageHeader titre="Mon compte" sousTitre={session.type === "principal" ? "Compte principal (mot de passe défini sur le serveur)." : session.email ?? ""} />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardHeader titre="Accès" />
          <CardBody>
            <Infos
              colonnes={1}
              items={[
                { label: "Nom", valeur: session.nom },
                { label: "Email", valeur: session.email ?? "—" },
                { label: "Niveau", valeur: session.superAdmin ? <Badge ton="violet">Super-administrateur · toutes les entités</Badge> : "Utilisateur" },
                {
                  label: "Entités",
                  valeur: (
                    <ul className="flex flex-col gap-1">
                      {entites.map((e) => {
                        const role = session.superAdmin ? "ADMINISTRATEUR" : session.acces.find((a) => a.entiteId === e.id)?.role;
                        return (
                          <li key={e.id} className="flex items-center gap-2">
                            <span>{e.nom}</span>
                            {role && <Badge ton={role === "LECTURE" ? "gris" : role === "ADMINISTRATEUR" ? "bleu" : "vert"}>{ROLES[role]}</Badge>}
                          </li>
                        );
                      })}
                    </ul>
                  ),
                },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader titre="Mot de passe" description={session.type === "principal" ? "Le mot de passe principal se modifie dans la variable APP_PASSWORD du serveur." : "Choisissez un mot de passe d'au moins 8 caractères."} />
          {session.type === "utilisateur" && (
            <CardBody>
              <ChangerMotDePasseForm action={changerMotDePasse} sansAncien={false} />
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
