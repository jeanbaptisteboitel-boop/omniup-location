# OMNIUP Location

Application de gestion locative pour les bailleurs (particuliers, SCI) et leur expert-comptable : lots, locataires et justificatifs, baux, appels de loyer automatiques, quittances, dépenses, emprunts et synthèse annuelle.

## Fonctionnalités

**Patrimoine**
- Bailleurs (personne physique ou société) : identité, adresse, IBAN imprimé sur les avis d'échéance.
- Immeubles (facultatif) : regroupement de lots pour les dépenses communes.
- Lots : appartements et maisons, meublés ou non, rattachés à un bailleur et éventuellement à un immeuble.

**Location**
- Locataires : nom, prénom, adresse, téléphone, email, et dossier de candidature : pièces d'identité, avis d'imposition, lettres de recommandation, justificatifs de domicile, justificatifs de revenus (PDF ou images).
- Baux reliant un lot et un ou plusieurs locataires (couple, colocation : titulaires solidaires, chacun destinataire des avis, quittances et courriers) : **non meublé**, **meublé** ou **bail mobilité** (loi de 1989), **bail commercial** (9 ans ou dérogatoire), **bail professionnel** (6 ans) et **location meublée de tourisme** (90 jours au plus), avec les règles de chaque type (durée par défaut, plafond ou liberté du dépôt de garantie, charges au forfait, motif du bail mobilité, indice de révision).
- Cycle de vie : brouillon → en signature (Omniup Sign) → signé → terminé.
- **Sortie du locataire** : réception du congé (par le locataire ou le bailleur, avec le préavis légal proposé selon le type de bail et réductible à un mois en zone tendue), date de départ calculée, état des lieux de sortie et sa conformité, clôture du bail au départ effectif avec recalcul du dernier loyer au prorata des jours occupés.
- **Dépôt de garantie** : encaissement (date, montant, mode de règlement, référence), retenues justifiées une à une, décompte de restitution tenant compte des loyers restant dus et de la majoration légale de 10 % par mois de retard, restitution enregistrée et lettre de décompte en PDF.
- **Assurance habitation** : attestations du locataire (compagnie, contrat, échéance, justificatif), état de la couverture (à jour, bientôt expirée, expirée, manquante), demande par email et relance automatique hebdomadaire tant que l'attestation manque ; le locataire dépose son attestation lui-même depuis son espace.
- **Demandes de maintenance** : signalées par le locataire depuis son espace, suivies par le gestionnaire jusqu'à leur résolution (voir plus bas).
- Contrat : rédaction manuelle ou par l'assistant IA, export PDF à faire signer.
- Révision annuelle du loyer sur l'IRL avec historique, courrier de notification ; le dernier IRL publié est récupéré automatiquement auprès de l'INSEE (service de données public, sans clé) et proposé à la signature comme à la révision.

**Loyers**
- Appels de loyer (avis d'échéance) émis automatiquement pour chaque bail signé, avec prorata temporis en début et fin de bail.
- **TVA sur les loyers** : le bailleur opte sur l'immeuble (CGI, art. 260 2°), puis sur chaque lot concerné ; le bail d'un local commercial ou professionnel peut alors être soumis à la TVA à 20 %, une location meublée de tourisme avec prestations para-hôtelières à 10 %. Les locations à usage d'habitation restent exonérées, sans option possible. Loyer et charges sont saisis hors taxes ; appels, avis d'échéance (qui tiennent lieu de facture, avec le numéro de TVA du bailleur), quittances, emails et espaces locataire et propriétaire présentent le hors taxes, la TVA et le TTC ; la synthèse annuelle et l'export des encaissements isolent la TVA collectée.
- PDF de l'avis d'échéance, envoi par email, enregistrement des paiements (virement, prélèvement, chèque, espèces).
- Quittance de loyer en PDF dès le paiement intégral (reçu en cas de paiement partiel), envoi par email.
- Relances pour loyer impayé (courrier amiable ou mise en demeure).

**Comptabilité**
- Dépenses par lot ou par immeuble : réparation et entretien, amélioration, gestion locative, copropriété, assurance propriétaire non occupant, taxe foncière, intérêts, autres, avec justificatif.
- Emprunts : échéancier généré à partir des caractéristiques du prêt ou importé depuis le tableau d'amortissement de la banque (CSV, Excel, PDF ou image via l'IA) pour constater les intérêts et l'assurance emprunteur.
- Synthèse annuelle recettes / dépenses par bien (état préparatoire à la déclaration 2044 ou à la comptabilité de la SCI), exports CSV.
- **Aide au remplissage de la déclaration 2044** (revenus fonciers au régime réel) : pour l'année choisie, une colonne par immeuble (ou lot isolé) avec les lignes 211 à 263 en euros entiers, le forfait de 20 € par local, le détail des travaux (rubrique 400) et des intérêts d'emprunt (rubrique 410), le calcul du résultat et sa répartition entre les cases 4BA, 4BB et 4BC de la 2042 (plafond de 10 700 €), la comparaison avec le micro-foncier, les locations meublées écartées (BIC) et les dépenses à affecter à la main ; état exportable en PDF.

**Modèles de documents** : 26 modèles fournis par défaut, modifiables et réinitialisables (baux d'habitation vide et meublé, bail mobilité, bail commercial, bail professionnel, bail dérogatoire, garage ou parking, location saisonnière ; avenants ; renouvellements ; congés et résiliations ; acte de cautionnement solidaire ; convention d'occupation précaire, location-gérance, domiciliation), plus vos propres modèles. Les variables ({{bail.loyerHC}}, {{locataire.nomComplet}}…) sont remplies avec les données du bail ; le document généré se complète, s'adapte avec l'IA, s'exporte en PDF et s'envoie par email.

**Entités** : par défaut une seule entité ; en activant la gestion multi-entités (Paramètres), une entreprise de gérance ou un cabinet gère plusieurs personnes et sociétés, chacune avec ses bailleurs, immeubles, lots, locataires, baux, dépenses, emprunts et documents, l'entité de travail se choisissant dans la barre latérale.

**Espace locataire** : chaque locataire reçoit un lien d'accès personnel (créé depuis sa fiche, envoyé par email ou copié) qui ouvre `/espace` : détail du bail, exemplaire signé du contrat déposé par le gestionnaire, avis d'échéance et quittances en PDF, courriers et documents envoyés ou marqués remis, solde dû et échéances en retard, dépôt de son attestation d'assurance habitation, et demandes de maintenance avec leur suivi. Le lien reste valable jusqu'à sa révocation depuis la fiche du locataire ; un lien perdu se redemande par email depuis la page de connexion de l'espace.

**Demandes de maintenance** : depuis son espace, le locataire signale un problème (objet, description, catégorie, urgence, photo) sur le logement qu'il occupe. Le gestionnaire les suit dans la rubrique Maintenance, filtre par statut, urgence et lot, répond dans un fil d'échanges avec pièces jointes, prend en compte, planifie une intervention à une date, clôture ou refuse en motivant, et peut créer la dépense correspondante en un clic. Le locataire suit l'avancement, répond, est prévenu par email à chaque réponse et signale lui-même que le problème est résolu.

**Espace propriétaire** : chaque bailleur (propriétaire dont vous gérez les biens) dispose de même d'un lien d'accès personnel, créé depuis sa fiche, qui ouvre `/proprietaire` : ses lots (loués ou vacants), le bail en cours et les baux passés de chaque lot avec le contrat et l'exemplaire signé, les appels de loyer avec avis et quittances, les dépenses avec justificatifs, les loyers encaissés et le reste dû, et la synthèse annuelle recettes / dépenses limitée à ses biens.

**Comptes utilisateurs et rôles** : dès qu'un secret de session (`APP_SECRET`) est défini, l'application demande une connexion par email et mot de passe. Le premier compte, créé à la première ouverture, est **super-administrateur** (le cabinet) : il voit toutes les entités et gère tous les comptes. Chaque autre utilisateur reçoit un rôle par entité : **administrateur** (toutes les opérations, les paramètres de l'entité et ses utilisateurs), **gestionnaire** (opérations courantes) ou **lecture seule** (consultation, aucune modification ni envoi). Les comptes se créent par invitation par email (l'utilisateur choisit son mot de passe, lien valable 7 jours) ou avec un mot de passe initial ; ils se désactivent sans perdre leurs accès ; chacun change son mot de passe depuis « Mon compte » ou par « Mot de passe oublié ». Les formulaires publics (connexion, mot de passe oublié, lien d'accès perdu des espaces locataire et propriétaire) peuvent être protégés des robots par Cloudflare Turnstile.

**Indices INSEE** : les indices IRL, ILC, ILAT, ICC et BT01 sont lus chaque jour sur le service de données de l'INSEE (accès libre, sans clé), historisés en base depuis 2000 avec leur statut (provisoire ou définitif) et le journal des révisions, consultables (tableau, historique, courbe) et exposés par une API interne ; d'autres séries s'ajoutent sans redéploiement, leur idbank étant vérifié auprès de l'INSEE. Détails : `src/lib/insee/README.md`.

**Assistance** : un bouton « Aide » présent en bas de chaque page ouvre un ticket en trois clics : demande d'aide, signalement d'un problème ou proposition d'amélioration, avec une capture d'écran facultative. La page d'où le ticket est ouvert et le navigateur utilisé sont joints automatiquement. Les tickets sont conservés dans la rubrique Assistance (statut nouveau, en cours, résolu, fermé, note de suivi) et transmis par email à l'adresse `SUPPORT_EMAIL` lorsqu'elle est renseignée.

**Calculatrices** : pourcentages de loyer et taux d'effort, révision de loyer par indice (IRL annuel, ILC/ILAT annuel ou triennal, plafond, derniers indices publiés par l'INSEE récupérés en un clic), rentabilité brute et nette avec cash-flow, frais de notaire, capacité d'emprunt, mensualité et coût d'un prêt, prêt in fine.

**Assistant IA** (Anthropic Claude) : chatbot de conseil en gestion locative connaissant l'entité de travail, rédaction de tout courrier (enregistrable comme document), rédaction des contrats, courriers de révision ou de relance et emails d'accompagnement. **OCR et extraction** (Mistral) : lecture des échéanciers PDF ou photographiés.

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
| `APP_SECRET` | Secret aléatoire (32 caractères ou plus) qui signe le cookie de session et active les comptes utilisateurs : la première ouverture de `/connexion` crée le compte super-administrateur. |
| `APP_PASSWORD` | Facultatif : mot de passe principal. Demandé en plus pour créer le premier compte et utilisable en secours (`/connexion?mode=principal`) ; seul, il protège l'application sans comptes, comme auparavant. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Facultatif : clés d'un widget [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/) (protection anti-robots des formulaires de connexion et de demande de lien). |
| `RESEND_API_KEY`, `MAIL_FROM` | Envoi des avis, quittances, contrats et courriers par email via [Resend](https://resend.com) (clé API + adresse d'expédition sur un domaine vérifié). Sans configuration, les PDF restent téléchargeables. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Alternative à Resend : serveur SMTP classique, utilisé seulement si `RESEND_API_KEY` est vide (l'expéditeur reste `MAIL_FROM`). |
| `AVIS_JOURS_AVANCE` | Nombre de jours avant le début du mois pour émettre l'avis d'échéance (10 par défaut). |
| `AVIS_ENVOI_AUTO` | `true` pour envoyer automatiquement les avis émis par la tâche planifiée. |
| `CRON_SECRET` | Secret protégeant `/api/cron/loyers`, `/api/cron/indices` et `/api/cron/assurances`. |
| `APP_URL` | Adresse publique de l'application (ex. `https://votre-app.vercel.app`, plusieurs adresses séparées par des virgules) : origine autorisée à envoyer les fichiers directement vers le bucket. |
| `INSEE_URL` | Facultatif : base du service de données de l'INSEE (`https://bdm.insee.fr` par défaut), à changer seulement pour passer par un relais. |
| `SUPPORT_EMAIL` | Facultatif : adresse recevant les tickets d'assistance ouverts depuis le bouton « Aide » (à défaut, `ALERTES_EMAIL`). Sans adresse, les tickets restent consultables dans l'application. |
| `ALERTES_EMAIL` | Facultatif : adresse qui reçoit les alertes du module Indices INSEE (échecs répétés, série arrêtée ou rebasée, libellé modifié) quand l'envoi d'emails est configuré ; sinon les alertes restent visibles dans l'application. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | Assistant de rédaction (modèle `claude-opus-5` par défaut). |
| `MISTRAL_API_KEY`, `MISTRAL_MODEL_OCR`, `MISTRAL_MODEL_EXTRACTION` | OCR et extraction des échéanciers PDF/images (`mistral-ocr-latest`, `mistral-medium-latest`). |
| `OMNIUP_SIGN_URL`, `OMNIUP_SIGN_API_KEY` | Réservé à l'intégration Omniup Sign (à venir). |

La page **Paramètres** de l'application affiche l'état de chaque configuration et permet d'envoyer un email de test.

## Déploiement (Vercel + Neon + Scaleway)

1. **Neon** : créez un projet PostgreSQL et récupérez les deux chaînes de connexion (pooled → `DATABASE_URL`, directe → `DIRECT_URL`).
2. **Scaleway Object Storage** : créez un bucket privé (région `fr-par` par exemple) et une clé API ; renseignez `SCW_ACCESS_KEY`, `SCW_SECRET_KEY`, `SCW_BUCKET`, `SCW_REGION`. Autorisez l'envoi direct depuis le navigateur : une fois l'application déployée avec `APP_URL` renseignée, cliquez sur « Autoriser l'envoi direct » dans Paramètres (carte Stockage des fichiers), ou lancez `APP_URL=https://votre-app.vercel.app node scripts/configurer-cors.mjs`. Sans cette règle CORS, l'import d'un document échoue avec « Failed to fetch ».
3. **Vercel** : importez le dépôt, renseignez toutes les variables du tableau ci-dessus (au minimum base, stockage, `APP_SECRET`, `CRON_SECRET`). Le fichier `vercel.json` applique les migrations avant chaque build (`prisma migrate deploy`) et planifie chaque jour l'émission des appels de loyer à 6 h UTC via `/api/cron/loyers` et la synchronisation des indices INSEE à 7 h 30 UTC (9 h 30 à Paris en heure d'été) via `/api/cron/indices`, et chaque lundi la relance des attestations d'assurance à 8 h UTC via `/api/cron/assurances` (Vercel transmet `CRON_SECRET` automatiquement).
4. Les fonctions longues (rédaction IA, OCR, envois d'emails) déclarent `maxDuration = 300` ; si votre projet Vercel n'utilise pas Fluid compute, ramenez cette valeur à 60 dans les pages concernées.
5. **Première connexion** : ouvrez `/connexion` et créez le compte super-administrateur (nom, email, mot de passe ; le mot de passe principal est demandé en plus si `APP_PASSWORD` est défini). Créez ensuite les autres utilisateurs depuis la page Utilisateurs, par invitation par email ou avec un mot de passe initial. Pour protéger les formulaires publics des robots, créez un widget [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile) pour le domaine de l'application et renseignez `TURNSTILE_SITE_KEY` et `TURNSTILE_SECRET_KEY`.

Limites Vercel à connaître : une requête ne peut pas dépasser 4,5 Mo, d'où l'envoi des documents directement vers Scaleway depuis le navigateur ; l'import d'un échéancier PDF par OCR est limité à 4 Mo (utilisez le CSV ou l'Excel de la banque au-delà).

Génération des PDF sur Vercel : les contrats, avis, quittances, courriers et documents sont produits par pdfkit, déclaré paquet externe dans `next.config.ts`. Ses polices standard, chargées à l'exécution, sont embarquées explicitement (`outputFileTracingIncludes`) : sans cette ligne, chaque téléchargement de PDF échoue en production avec « Cannot find module '#standard-fonts/Helvetica' » (un test unitaire vérifie cette configuration, et les routes PDF journalisent toute erreur de génération dans les logs Vercel).

## Émission automatique des appels de loyer

Les appels sont générés à chaque ouverture du tableau de bord ou de la page Loyers, et par la tâche planifiée Vercel. Hors Vercel, appelez chaque jour `GET /api/cron/loyers?secret=VOTRE_CRON_SECRET` (ou en-tête `Authorization: Bearer`) depuis une tâche planifiée, un cron ou un scénario Make. Avec `AVIS_ENVOI_AUTO=true`, les avis nouvellement émis sont envoyés par email.

## Signature électronique (Omniup Sign)

Aujourd'hui, le contrat est téléchargé en PDF depuis la fiche du bail, signé dans Omniup Sign, puis le bail est marqué comme signé (avec la référence du dossier). L'envoi direct vers Omniup Sign et la réception automatique de la signature sont prévus.

## Développement

```bash
npm run typecheck   # vérification TypeScript
npm test            # tests unitaires (règles des baux, appels de loyer, échéanciers, montants, indices INSEE, TVA, aide 2044, préavis et dépôt de garantie, assurance, sessions et comptes, espaces locataire et propriétaire, déploiement des PDF)
node scripts/verifier-idbanks.mjs   # contrôle des idbanks INSEE par appel réel (libellé officiel, dernière valeur)
npm run db:studio   # exploration de la base de données
```

Pile technique : Next.js 15 (App Router, actions serveur), Prisma + PostgreSQL (Neon), Tailwind CSS 4, pdfkit, Resend (ou nodemailer), exceljs, SDK AWS S3 (Scaleway), SDK Anthropic, SDK Mistral.

Interface : maquettes réalisées dans Claude Design à partir du brief `docs/prompt-claude-design.md` (registre « portail » de la charte OMNIUP : police Manrope chargée depuis Google Fonts, palette navy/cyan, composants du kit `src/components/ui.tsx` et `form.tsx`, icônes linéaires `src/components/icones.tsx`). Les 15 écrans (tableau de bord, patrimoine, locataires, baux, loyers, comptabilité, documents, outils, paramètres) suivent ces maquettes, avec une navigation en tiroir et des listes en cartes sur mobile.

## Sauvegarde

En production, les données sont dans Neon (sauvegardes et branches gérées par Neon) et les fichiers dans le bucket Scaleway. En local, sauvegardez la base PostgreSQL et le dossier `storage/`.
