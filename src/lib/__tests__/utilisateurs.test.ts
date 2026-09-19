import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const etat = vi.hoisted(() => ({ cookie: undefined as string | undefined, utilisateur: null as null | Record<string, unknown> }));

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (nom: string) => (nom === "omniup_session" && etat.cookie ? { value: etat.cookie } : undefined), set: vi.fn(), delete: vi.fn() }),
}));
vi.mock("../prisma", () => ({ prisma: { utilisateur: { findUnique: async () => etat.utilisateur, count: async () => (etat.utilisateur ? 1 : 0) } } }));

import { creerJeton } from "../session";
import {
  administreUneEntite,
  entitesAccessibles,
  entitesAdministrees,
  estAdministrateur,
  exigerSession,
  hacherMotDePasse,
  peutEcrire,
  problemeMotDePasse,
  roleSur,
  sessionCourante,
  verifierMotDePasse,
  type Session,
} from "../utilisateurs";

const session = (acces: Session["acces"], superAdmin = false): Session => ({ type: "utilisateur", utilisateurId: 1, nom: "Test", email: "t@exemple.fr", superAdmin, acces });

describe("mots de passe", () => {
  it("hache avec un sel aléatoire et vérifie", () => {
    const h1 = hacherMotDePasse("motdepasse1");
    const h2 = hacherMotDePasse("motdepasse1");
    expect(h1).not.toBe(h2);
    expect(h1.startsWith("scrypt$")).toBe(true);
    expect(verifierMotDePasse("motdepasse1", h1)).toBe(true);
    expect(verifierMotDePasse("motdepasse2", h1)).toBe(false);
    expect(verifierMotDePasse("motdepasse1", null)).toBe(false);
    expect(verifierMotDePasse("motdepasse1", "md5$abc$def")).toBe(false);
    expect(verifierMotDePasse("motdepasse1", "scrypt$sel")).toBe(false);
  });
  it("exige 8 caractères et une confirmation identique", () => {
    expect(problemeMotDePasse("court")).toMatch(/8 caractères/);
    expect(problemeMotDePasse("assezlong", "different")).toMatch(/ne correspondent pas/);
    expect(problemeMotDePasse("assezlong", "assezlong")).toBeNull();
    expect(problemeMotDePasse("assezlong")).toBeNull();
  });
});

describe("rôles par entité", () => {
  const s = session([
    { entiteId: 1, role: "ADMINISTRATEUR" },
    { entiteId: 2, role: "GESTIONNAIRE" },
    { entiteId: 3, role: "LECTURE" },
  ]);
  it("rôle effectif, écriture et administration", () => {
    expect(roleSur(s, 1)).toBe("ADMINISTRATEUR");
    expect(roleSur(s, 9)).toBeNull();
    expect(peutEcrire(s, 1)).toBe(true);
    expect(peutEcrire(s, 2)).toBe(true);
    expect(peutEcrire(s, 3)).toBe(false);
    expect(peutEcrire(s, 9)).toBe(false);
    expect(estAdministrateur(s, 1)).toBe(true);
    expect(estAdministrateur(s, 2)).toBe(false);
    expect(administreUneEntite(s)).toBe(true);
    expect(administreUneEntite(session([{ entiteId: 2, role: "GESTIONNAIRE" }]))).toBe(false);
    expect(entitesAdministrees(s)).toEqual([1]);
    expect(entitesAccessibles(s)).toEqual([1, 2, 3]);
  });
  it("le super-administrateur est administrateur partout", () => {
    const sa = session([], true);
    expect(roleSur(sa, 42)).toBe("ADMINISTRATEUR");
    expect(peutEcrire(sa, 42)).toBe(true);
    expect(entitesAdministrees(sa)).toBe("toutes");
    expect(entitesAccessibles(sa)).toBe("toutes");
  });
});

describe("session courante", () => {
  beforeEach(() => {
    process.env.APP_SECRET = "secret-de-test";
    etat.cookie = undefined;
    etat.utilisateur = null;
  });
  afterEach(() => {
    delete process.env.APP_SECRET;
  });
  it("protection inactive : compte principal", async () => {
    delete process.env.APP_SECRET;
    expect((await sessionCourante())?.type).toBe("principal");
  });
  it("sans cookie : non connecté, et redirection vers la connexion", async () => {
    expect(await sessionCourante()).toBeNull();
    await expect(exigerSession()).rejects.toThrow("redirect:/connexion");
  });
  it("jeton principal : compte principal super-administrateur", async () => {
    etat.cookie = (await creerJeton()).valeur;
    const s = await sessionCourante();
    expect(s?.type).toBe("principal");
    expect(s?.superAdmin).toBe(true);
  });
  it("jeton utilisateur : rôles chargés, compte désactivé refusé", async () => {
    etat.cookie = (await creerJeton(7)).valeur;
    etat.utilisateur = { id: 7, nom: "Marie", email: "m@exemple.fr", superAdmin: false, actif: true, acces: [{ entiteId: 4, role: "GESTIONNAIRE" }] };
    const s = await sessionCourante();
    expect(s?.type).toBe("utilisateur");
    expect(s?.acces).toEqual([{ entiteId: 4, role: "GESTIONNAIRE" }]);
    etat.utilisateur = { ...etat.utilisateur, actif: false };
    expect(await sessionCourante()).toBeNull();
    etat.utilisateur = null;
    expect(await sessionCourante()).toBeNull();
  });
});

describe("limitation des envois de liens", () => {
  it("détecte un lien émis il y a moins de deux minutes, quelle que soit sa durée", async () => {
    const { DUREE_INVITATION_MS, DUREE_REINITIALISATION_MS, lienToutJusteEnvoye } = await import("../utilisateurs");
    const maintenant = Date.UTC(2026, 8, 19, 10, 0, 0);
    const emis = (ilYA: number, duree: number) => new Date(maintenant - ilYA + duree);
    expect(lienToutJusteEnvoye(null, maintenant)).toBe(false);
    expect(lienToutJusteEnvoye(emis(30_000, DUREE_REINITIALISATION_MS), maintenant)).toBe(true);
    expect(lienToutJusteEnvoye(emis(30_000, DUREE_INVITATION_MS), maintenant)).toBe(true);
    expect(lienToutJusteEnvoye(emis(5 * 60_000, DUREE_REINITIALISATION_MS), maintenant)).toBe(false);
    expect(lienToutJusteEnvoye(emis(3 * 24 * 3600_000, DUREE_INVITATION_MS), maintenant)).toBe(false);
    expect(lienToutJusteEnvoye(new Date(maintenant - 1000), maintenant)).toBe(false);
  });
});
