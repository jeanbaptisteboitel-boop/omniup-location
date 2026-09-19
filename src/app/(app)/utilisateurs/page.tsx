import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/params";
import { avecMessage } from "@/lib/erreurs";
import { formatDateHeure } from "@/lib/dates";
import { mailConfigure } from "@/lib/mail";
import { DESCRIPTIONS_ROLES, ROLES, administreUneEntite, entitesAdministrees, exigerSession } from "@/lib/utilisateurs";
import { basculerActif, basculerSuperAdmin, creerUtilisateur, modifierRole, renvoyerInvitation, retirerAcces } from "@/actions/utilisateurs";
import { Badge, Button, Card, CardBody, CardHeader, PageHeader, Tableau, TableauPied, Td, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { Flash } from "@/components/flash";
import { UtilisateurForm } from "@/components/utilisateurs/utilisateur-form";
import { RoleSelect } from "@/components/utilisateurs/role-select";

export const metadata = { title: "Utilisateurs" };
export const dynamic = "force-dynamic";

export default async function UtilisateursPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await exigerSession();
  if (!administreUneEntite(session)) redirect(avecMessage("/", "La page Utilisateurs est réservée aux administrateurs.", "erreur"));
  const sp = await searchParams;
  const administrees = entitesAdministrees(session);
  const entites = await prisma.entite.findMany({ where: administrees === "toutes" ? {} : { id: { in: administrees } }, orderBy: { nom: "asc" } });
  const utilisateurs = await prisma.utilisateur.findMany({
    where: administrees === "toutes" ? {} : { acces: { some: { entiteId: { in: administrees } } } },
    include: { acces: { include: { entite: true }, orderBy: { entite: { nom: "asc" } } } },
    orderBy: [{ actif: "desc" }, { nom: "asc" }],
  });
  const roles = (Object.keys(ROLES) as (keyof typeof ROLES)[]).map((r) => ({ value: r, label: ROLES[r], description: DESCRIPTIONS_ROLES[r] }));
  const mail = mailConfigure();
  const administre = (entiteId: number) => administrees === "toutes" || administrees.includes(entiteId);
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;
  return (
    <>
      <PageHeader titre="Utilisateurs" sousTitre={`${pluriel(utilisateurs.length, "compte", "comptes")} · ${session.superAdmin ? "toutes les entités" : `${pluriel(entites.length, "entité administrée", "entités administrées")}`}. Un administrateur gère l'entité et ses utilisateurs ; un gestionnaire réalise les opérations courantes ; la lecture seule consulte sans modifier.`} />
      <Flash sp={sp} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card>
          <CardHeader titre="Comptes" description="Rôle modifiable directement dans le tableau. Un compte désactivé ne peut plus se connecter mais conserve ses accès." />
          {utilisateurs.length === 0 ? (
            <CardBody>
              <p className="text-sm text-slate-500">Aucun utilisateur pour l'instant : créez le premier compte ci-contre.</p>
            </CardBody>
          ) : (
            <>
              <Tableau>
                <thead className="bg-slate-50">
                  <tr>
                    <Th>Utilisateur</Th>
                    <Th>Accès</Th>
                    <Th>Statut</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {utilisateurs.map((u) => {
                    const moi = u.id === session.utilisateurId;
                    const enAttente = !u.motDePasse;
                    const gerable = session.superAdmin || (!u.superAdmin && u.acces.every((a) => administre(a.entiteId)));
                    return (
                      <tr key={u.id} className={u.actif ? "align-top hover:bg-slate-50" : "align-top bg-slate-50/60 text-slate-500"}>
                        <Td>
                          <span className="block font-semibold text-navy-900">{u.nom}{moi && <span className="ml-1.5 text-xs font-medium text-slate-500">(vous)</span>}</span>
                          <span className="block text-xs text-slate-500">{u.email}</span>
                          {u.superAdmin && <Badge ton="violet" className="mt-1">Super-administrateur</Badge>}
                          <span className="block text-xs text-slate-500">{u.derniereConnexion ? `Dernière connexion le ${formatDateHeure(u.derniereConnexion)}` : "Jamais connecté"}</span>
                        </Td>
                        <Td>
                          {u.superAdmin && u.acces.length === 0 && <span className="text-xs text-slate-500">Toutes les entités</span>}
                          <ul className="flex flex-col gap-1.5">
                            {u.acces.map((a) => (
                              <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                                <span className="font-medium text-navy-900">{a.entite.nom}</span>
                                {administre(a.entiteId) && u.actif ? (
                                  <>
                                    <RoleSelect action={modifierRole} utilisateurId={u.id} entiteId={a.entiteId} role={a.role} roles={roles} />
                                    <form action={retirerAcces}>
                                      <input type="hidden" name="utilisateurId" value={u.id} />
                                      <input type="hidden" name="entiteId" value={a.entiteId} />
                                      <button type="submit" className="cursor-pointer text-xs text-red-700 hover:underline">Retirer</button>
                                    </form>
                                  </>
                                ) : (
                                  <Badge ton="gris">{ROLES[a.role]}</Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                          {u.actif && entites.some((en) => !u.acces.some((a) => a.entiteId === en.id)) && (
                            <form action={modifierRole} className="mt-2 flex flex-wrap items-center gap-2">
                              <input type="hidden" name="utilisateurId" value={u.id} />
                              <select name="entiteId" aria-label="Entité" className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-navy-900">
                                {entites.filter((en) => !u.acces.some((a) => a.entiteId === en.id)).map((en) => (
                                  <option key={en.id} value={en.id}>{en.nom}</option>
                                ))}
                              </select>
                              <select name="role" aria-label="Rôle à accorder" defaultValue="GESTIONNAIRE" className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs text-navy-900">
                                {roles.map((r) => (
                                  <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                              </select>
                              <Button type="submit" variante="secondary" taille="sm">Ajouter l'accès</Button>
                            </form>
                          )}
                        </Td>
                        <Td>
                          {!u.actif ? <Badge ton="rouge">Désactivé</Badge> : enAttente ? <Badge ton="orange">Invitation en attente</Badge> : <Badge ton="vert">Actif</Badge>}
                        </Td>
                        <Td>
                          <div className="flex flex-col items-start gap-1.5">
                            {gerable && !moi && (
                              <ConfirmForm action={basculerActif} titre={u.actif ? "Désactiver ce compte ?" : "Réactiver ce compte ?"} message={u.actif ? `${u.nom} ne pourra plus se connecter. Ses accès sont conservés pour une réactivation ultérieure.` : `${u.nom} pourra de nouveau se connecter.`} libelleConfirmer={u.actif ? "Désactiver" : "Réactiver"}>
                                <input type="hidden" name="id" value={u.id} />
                                <Button type="submit" variante={u.actif ? "danger" : "secondary"} taille="sm">{u.actif ? "Désactiver" : "Réactiver"}</Button>
                              </ConfirmForm>
                            )}
                            {gerable && u.actif && mail && (
                              <form action={renvoyerInvitation}>
                                <input type="hidden" name="id" value={u.id} />
                                <Button type="submit" variante="secondary" taille="sm">{enAttente ? "Renvoyer l'invitation" : "Envoyer un lien de mot de passe"}</Button>
                              </form>
                            )}
                            {session.superAdmin && !moi && (
                              <form action={basculerSuperAdmin}>
                                <input type="hidden" name="id" value={u.id} />
                                <Button type="submit" variante="ghost" taille="sm">{u.superAdmin ? "Retirer super-admin" : "Nommer super-admin"}</Button>
                              </form>
                            )}
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Tableau>
              <TableauPied pagination={false}>{pluriel(utilisateurs.length, "compte", "comptes")} · les rôles s'appliquent entité par entité.</TableauPied>
            </>
          )}
        </Card>
        <Card>
          <CardHeader titre="Nouvel utilisateur" description="Un email déjà connu reçoit simplement les accès cochés." />
          <CardBody>
            <UtilisateurForm action={creerUtilisateur} entites={entites.map((e) => ({ id: e.id, nom: e.nom }))} roles={roles} superAdminPossible={session.superAdmin} mailConfigure={mail} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
