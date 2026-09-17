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

**Assistant de rédaction** (Anthropic Claude) : contrats de bail, courriers (révision de loyer, relance) et emails d'accompagnement. **OCR et extraction** (Mistral) : lecture des échéanciers PDF ou photographiés.

## Installation en local

Prérequis : Node.js 20 ou plus récent et une base PostgreSQL (locale, ou une branche de développement Neon).

```bash
npm install
cp .env.example .env   # renseigner DATABASE_URL et DIRECT_URL
npm run setup          # crée le dossier storage/ et applique les migrations
npm run dev            # http://localhost:3000
```

Sans variables `SCW_*`, les fichiers importés sont écrits dans `storage/` ; sans `APP_PASSWORD`, l'application est en accès libre (réservé au poste local).

## Configuration (fichier `.env` ou variables Vercel)

| Variable | Rôle |
|---|---|
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL : chaîne « pooled » pour l'application et chaîne directe pour les migrations (Neon fournit les deux). |
| `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_BUCKET`, `SCW_REGION`, `SCW_ENDPOINT` | Stockage objet Scaleway (compatible S3) pour les fichiers importés. Obligatoire sur Vercel. |
| `STORAGE_DIR` | Dossier local utilisé quand le stockage objet n'est pas configuré. |
| `APP_PASSWORD`, `APP_SECRET` | Mot de passe d'accès à l'application et secret de signature de la session. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Envoi des avis, quittances et courriers par email. Sans configuration, les PDF restent téléchargeables. |
| `AVIS_JOURS_AVANCE` | Nombre de jours avant le début du mois pour émettre l'avis d'échéance (10 par défaut). |
| `AVIS_ENVOI_AUTO` | `true` pour envoyer automatiquement les avis émis par la tâche planifiée. |
| `CRON_SECRET` | Secret protégeant `/api/cron/loyers`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Assistant de rédaction (modèle `claude-opus-5` par défaut). |
| `MISTRAL_API_KEY`, `MISTRAL_MODEL_OCR`, `MISTRAL_MODEL_EXTRACTION` | OCR et extraction des échéanciers PDF/images (`mistral-ocr-latest`, `mistral-medium-latest`). |
| `OMNIUP_SIGN_URL`, `OMNIUP_SIGN_API_KEY` | Réservé à l'intégration Omniup Sign (à venir). |

La page **Paramètres** de l'application affiche l'état de chaque configuration et permet d'envoyer un email de test.

## Déploiement (Vercel + Neon + Scaleway)

1. **Neon** : créez un projet PostgreSQL et récupérez les deux chaînes de connexion (pooled → `DATABASE_URL`, directe → `DIRECT_URL`).
2. **Scaleway Object Storage** : créez un bucket privé (région `fr-par` par exemple) et une clé API ; renseignez `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_BUCKET`, `SCW_REGION`. Autorisez l'envoi direct depuis le navigateur avec `APP_URL=https://votre-app.vercel.app node scripts/configurer-cors.mjs`.
3. **Vercel** : importez le dépôt, renseignez toutes les variables du tableau ci-dessus (au minimum base, stockage, `APP_PASSWORD`, `CRON_SECRET`). Le fichier `vercel.json` applique les migrations avant chaque build (`prisma migrate deploy`) et planifie l'émission des appels de loyer chaque jour à 6 h UTC via `/api/cron/loyers` (Vercel transmet `CRON_SECRET` automatiquement).
4. Les fonctions longues (rédaction IA, OCR, envois d'emails) déclarent `maxDuration = 300` ; si votre projet Vercel n'utilise pas Fluid compute, ramenez cette valeur à 60 dans les pages concernées.

Limites Vercel à connaître : une requête ne peut pas dépasser 4,5 Mo, d'où l'envoi des documents directement vers Scaleway depuis le navigateur ; l'import d'un échéancier PDF par OCR est limité à 4 Mo (utilisez le CSV ou l'Excel de la banque au-delà).

## Émission automatique des appels de loyer

Les appels sont générés à chaque ouverture du tableau de bord ou de la page Loyers, et par la tâche planifiée Vercel. Hors Vercel, appelez chaque jour `GET /api/cron/loyers?secret=VOTRE_CRON_SECRET` (ou en-tête `Authorization: Bearer`) depuis une tâche planifiée, un cron ou un scénario Make. Avec `AVIS_ENVOI_AUTO=true`, les avis nouvellement émis sont envoyés par email.

## Signature électronique (Omniup Sign)

Aujourd'hui, le contrat est téléchargé en PDF depuis la fiche du bail, signé dans Omniup Sign, puis le bail est marqué comme signé (avec la référence du dossier). L'envoi direct vers Omniup Sign et la réception automatique de la signature sont prévus.

## Développement

```bash
npm run typecheck   # vérification TypeScript
npm test            # tests unitaires (règles des baux, appels de loyer, échéanciers, montants)
npm run db:studio   # exploration de la base de données
```

Pile technique : Next.js 15 (App Router, actions serveur), Prisma + PostgreSQL (Neon), Tailwind CSS 4, pdfkit, nodemailer, exceljs, SDK AWS S3 (Scaleway), SDK Anthropic, SDK Mistral.

## Sauvegarde

En production, les données sont dans Neon (sauvegardes et branches gérées par Neon) et les fichiers dans le bucket Scaleway. En local, sauvegardez la base PostgreSQL et le dossier `storage/`.
