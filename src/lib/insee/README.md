# Module Indices INSEE

Récupération automatique des indices publiés par l'INSEE (IRL, ILC, ILAT, ICC, BT01…), historisation en base et exposition au reste de l'application (révisions de loyers, calculatrices, consultation).

## Source

Service web SDMX 2.1 de la Banque de données macroéconomiques (BDM), accès direct, gratuit et sans authentification :
`GET https://bdm.insee.fr/series/sdmx/data/SERIES_BDM/{idbank1}+{idbank2}…` avec `startPeriod` ou `lastNObservations` (400 idbanks au plus par requête). Réponse XML « StructureSpecificData » : chaque `<Series>` porte `IDBANK`, `TITLE_FR`, `FREQ`, `UNIT_MEASURE`, `BASE_PER`, `LAST_UPDATE` ; chaque `<Obs>` porte `TIME_PERIOD`, `OBS_VALUE`, `OBS_STATUS` (A définitif, P provisoire). Documentation : https://www.insee.fr/fr/information/2862759. Aucun passage par portail-api.insee.fr, aucun scraping des pages insee.fr.

## Séries suivies

| Code | Libellé | Fréquence | Idbank | État |
|---|---|---|---|---|
| IRL | Indice de référence des loyers | trimestrielle | 001515333 | fourni par le brief, à confirmer par appel réel |
| ILC | Indice des loyers commerciaux | trimestrielle | 001532540 | idem |
| ILAT | Indice des loyers des activités tertiaires | trimestrielle | 001617112 | idem |
| ICC | Indice du coût de la construction | trimestrielle | 000008630 | idem |
| BT01 | Index bâtiment tous corps d'état (base 2010) | mensuelle | 001710986 | idem |

IPC, IPC hors tabac et SMIC horaire ne sont pas livrés : leurs idbanks n'ont pas pu être vérifiés par un appel réel (le service de l'INSEE est inaccessible depuis l'environnement de développement). Ils s'ajoutent depuis la page Indices INSEE (« Ajouter une série »), l'idbank étant alors contrôlé auprès de l'INSEE avant enregistrement.

Vérification des idbanks : bouton « Vérifier les idbanks » de la page Indices INSEE (enregistre le libellé officiel reçu, `TITLE_FR`), ou `node scripts/verifier-idbanks.mjs [idbank …]` depuis un poste ayant accès à Internet.

## Modèle de données (Prisma)

- `IndiceSerie` : référentiel vivant en base (`code`, `idbank` unique, `libelle`, `libelleInsee` reçu de l'INSEE, `frequence` M/Q/A, `unite`, `base`, `active`, `derniereSync`, `dernierePeriode`, `echecsConsecutifs`, `dernierEchec`). Une seule série active par code ; un rebasage (nouvel idbank pour un même code) désactive l'ancienne série, dont l'historique est conservé.
- `IndiceObservation` : (`serieId`, `periode`) unique, `debutPeriode` (premier jour, pour les tris), `valeur` en `Decimal(18,6)` (jamais en flottant), `statut`, `recupereLe`.
- `IndiceRevision` : ancienne et nouvelle valeur (et statuts) quand une observation déjà enregistrée change.
- `IndiceSynchronisation` : journal d'exécution (déclencheur, séries interrogées, créées, mises à jour, erreurs, alertes).

Migration `prisma/migrations/20260919120000_indices_insee` (tables + insertion du lot initial). Les séries manquantes sont aussi recréées à la volée par `initialiserSeriesDefaut()`.

## Ingestion (`src/lib/insee/`)

- `client.ts` : `fetchSeries(idbanks, { startPeriod | lastNObservations })`, lots de 400, délai 30 s, trois tentatives (1 s, 2 s, 4 s) sur erreur réseau ou serveur, `User-Agent` explicite ; une réponse 4xx (idbank inconnu) n'est pas rejouée.
- `parseur.ts` : `parseSdmx(xml)` avec fast-xml-parser (validation puis analyse), valeurs conservées en chaînes, série sans observation tolérée.
- `periodes.ts` : `AAAA-MM`, `AAAA-Qn`, `AAAA-Sn`, `AAAA` (début, décalage, un an avant, libellés, périodes écoulées).
- `upsert.ts` : `planifierUpsert(existantes, reçues)` — créations, révisions (valeur ou statut), inchangées ; idempotent.
- `sync.ts` : `synchroniserIndices({ declencheur })` — première synchronisation d'une série depuis `startPeriod=2000` (format adapté à la fréquence), puis `lastNObservations=6` ; un lot en échec est repris série par série ; journal et alertes.
- `lecture.ts` : `listerSeries()`, `historiqueSerie(code, { from, to })`, `valeurA(code, periode)`, `serieRecente(code)` (formulaires ; synchronisation à la première utilisation si la base est vide), `variationDecimal()`.
- `verification.ts` : `verifierIdbanks()` (appel réel `lastNObservations=1`, enregistrement de `TITLE_FR`), `verifierIdbank(idbank)`.

## Planification et alertes

- Vercel Cron : `/api/cron/indices` chaque jour à 7 h 30 UTC (9 h 30 à Paris en heure d'été, 8 h 30 en heure d'hiver), protégé par `CRON_SECRET` (`?secret=` ou `Authorization: Bearer`). Hors Vercel, appelez la même URL depuis un cron.
- Alertes (journal + page Indices, et email à `ALERTES_EMAIL` si l'envoi d'emails est configuré) : série en échec sur deux synchronisations d'affilée ; série sans nouvelle valeur depuis plus de deux périodes complètes (signal de rebasage) ; `TITLE_FR` reçu différent du libellé INSEE enregistré. Un échec isolé est journalisé sans alerte.

## Exposition

- `GET /api/insee/series` : séries avec dernière valeur, période, statut, variation sur un an.
- `GET /api/insee/series/{code}?from=&to=` : historique (bornes en périodes INSEE).
- `GET /api/insee/series/{code}/at?period=2025-Q2` : valeur à une période.
- Page `/indices` (tableau, ajout de série, journal) et `/indices/{code}` (historique, courbe, révisions, activation).
- Formulaires : le dernier IRL publié est proposé à la création d'un bail et à la révision du loyer ; la calculatrice « Révision par indice » charge IRL, ILC, ILAT ou ICC.

Ces routes sont protégées par la session de l'application (mot de passe `APP_PASSWORD`), comme le reste de l'API.

## Tests

- `__tests__/parseur.test.ts` : fixtures XML (`__fixtures__/`, construites d'après la documentation du service : série trimestrielle, série mensuelle avec valeur provisoire et observation sans valeur, série vide, deux séries).
- `__tests__/upsert.test.ts` : insertion, révision, idempotence, entrées illisibles.
- `__tests__/client.test.ts` : URL, lots de 400, tentatives, refus définitifs, `User-Agent`.
- `__tests__/periodes.test.ts`.
- `__tests__/integration.test.ts` : appel réel, exclu par défaut (`INSEE_INTEGRATION=1 npx vitest run src/lib/insee/__tests__/integration.test.ts`).

## Phase 2 (préparée, non développée)

Calculateur de révision « montant × indice nouveau / indice de référence » avec choix de l'indice et des deux périodes : `valeurA()` et `variationDecimal()` fournissent les valeurs exactes ; la calculatrice actuelle et la révision de loyer des baux utilisent déjà les séries synchronisées.
