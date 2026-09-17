# OMNIUP Location

Application de gestion locative pour les bailleurs (particuliers, SCI) et leur expert-comptable : lots, locataires et justificatifs, baux, appels de loyer automatiques, quittances, dépenses, emprunts et synthèse annuelle.

## Fonctionnalités

**Patrimoine**
- Bailleurs (personne physique ou société) : identité, adresse, IBAN imprimé sur les avis d'échéance.
- Immeubles (facultatif) : regroupement de lots pour les dépenses communes.
- Lots : appartements et maisons, meublés ou non, rattachés à un bailleur et éventuellement à un immeuble.

**Location**
- Locataires : nom, prénom, adresse, téléphone, email, et dossier de candidature : pièces d'identité, avis d'imposition, lettres de recommandation, justificatifs de domicile, justificatifs de revenus (PDF ou images).
- Baux reliant un lot et un locataire : **non meublé**, **meublé** ou **bail mobilité**, avec les règles légales de chaque type (durée par défaut, plafond du dépôt de garantie, charges au forfait, motif du bail mobilité).
- Cycle de vie : brouillon → en signature (Omniup Sign) → signé → terminé.
- Contrat : rédaction manuelle ou par l'assistant IA, export PDF à faire signer.
- Révision annuelle du loyer sur l'IRL avec historique, courrier de notification.

**Loyers**
- Appels de loyer (avis d'échéance) émis automatiquement pour chaque bail signé, avec prorata temporis en début et fin de bail.
- PDF de l'avis d'échéance, envoi par email, enregistrement des paiements (virement, prélèvement, chèque, espèces).
- Quittance de loyer en PDF dès le paiement intégral (reçu en cas de paiement partiel), envoi par email.
- Relances pour loyer impayé (courrier amiable ou mise en demeure).

**Comptabilité**
- Dépenses par lot ou par immeuble : réparation et entretien, amélioration, gestion locative, copropriété, assurance propriétaire non occupant, taxe foncière, intérêts, autres, avec justificatif.
- Emprunts : échéancier généré à partir des caractéristiques du prêt ou importé depuis le tableau d'amortissement de la banque (CSV, Excel, PDF ou image via l'IA) pour constater les intérêts et l'assurance emprunteur.
- Synthèse annuelle recettes / dépenses par bien (état préparatoire à la déclaration 2044 ou à la comptabilité de la SCI), exports CSV.

**Assistant IA** (Anthropic Claude) : rédaction des contrats de bail, des courriers (révision de loyer, relance) et des emails d'accompagnement ; lecture des échéanciers PDF.

## Installation

Prérequis : Node.js 20 ou plus récent.

```bash
npm install
npm run setup     # crée .env, le dossier storage/ et la base de données SQLite
npm run dev       # http://localhost:3000
```

Pour une utilisation quotidienne : `npm run build` puis `npm start`.

## Configuration (fichier `.env`)

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Base SQLite (par défaut `file:./dev.db` dans le dossier `prisma/`). |
| `STORAGE_DIR` | Dossier des fichiers importés (pièces d'identité, justificatifs). |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envoi des avis, quittances et courriers par email. Sans configuration, les PDF restent téléchargeables. |
| `AVIS_JOURS_AVANCE` | Nombre de jours avant le début du mois pour émettre l'avis d'échéance (10 par défaut). |
| `AVIS_ENVOI_AUTO` | `true` pour envoyer automatiquement les avis émis par la tâche planifiée. |
| `CRON_SECRET` | Secret protégeant `/api/cron/loyers`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Assistant IA (modèle `claude-opus-5` par défaut). |
| `OMNIUP_SIGN_URL`, `OMNIUP_SIGN_API_KEY` | Réservé à l'intégration Omniup Sign (à venir). |

La page **Paramètres** de l'application affiche l'état de chaque configuration et permet d'envoyer un email de test.

## Émission automatique des appels de loyer

Les appels sont générés à chaque ouverture du tableau de bord ou de la page Loyers. Pour une émission sans intervention (et l'envoi automatique des avis si `AVIS_ENVOI_AUTO=true`), appelez chaque jour :

```
GET http://localhost:3000/api/cron/loyers?secret=VOTRE_CRON_SECRET
```

depuis une tâche planifiée Windows, un cron ou un scénario Make.

## Signature électronique (Omniup Sign)

Aujourd'hui, le contrat est téléchargé en PDF depuis la fiche du bail, signé dans Omniup Sign, puis le bail est marqué comme signé (avec la référence du dossier). L'envoi direct vers Omniup Sign et la réception automatique de la signature sont prévus.

## Développement

```bash
npm run typecheck   # vérification TypeScript
npm test            # tests unitaires (règles des baux, appels de loyer, échéanciers, montants)
npm run db:studio   # exploration de la base de données
```

Pile technique : Next.js 15 (App Router, actions serveur), Prisma + SQLite, Tailwind CSS 4, pdfkit, nodemailer, exceljs, SDK Anthropic.

## Sauvegarde

Sauvegardez le fichier `prisma/dev.db` et le dossier `storage/`.
