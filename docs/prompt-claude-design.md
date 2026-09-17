# Prompt pour Claude Design — OMNIUP Location

Copiez le texte ci-dessous dans Claude Design (claude.ai/design) pour obtenir le design system et les écrans de l'application. Une fois le projet créé, utilisez « Send to Claude Code Web » pour le transmettre à Claude Code, qui l'intégrera dans le dépôt.

---

## Contexte produit

Conçois l'interface complète d'**OMNIUP Location**, une application web française de gestion locative destinée aux bailleurs particuliers, aux petites SCI et aux cabinets de gérance locative (expert-comptable en Normandie, clientèle de TPE : bâtiment, restauration, automobile, transport, coiffure…). L'utilisateur n'est pas un informaticien : il veut émettre ses appels de loyer, ses quittances et ses baux en quelques clics, suivre les impayés et préparer sa déclaration de revenus fonciers. Tout est en français, formats fr-FR (montants « 1 234,56 € », dates « 17/09/2026 »).

Ton : professionnel, rassurant, sobre et efficace, proche d'un logiciel de gestion moderne (type Pennylane ou Qonto) sans effet gadget. Desktop d'abord (écran 1440 px), mais l'application doit rester utilisable sur tablette et mobile (menu latéral repliable en tiroir).

## Identité visuelle (à respecter)

- Couleur principale : bleu marine « navy » — 50 #eef2f9, 100 #d9e1f1, 200 #b3c3e3, 300 #8aa2d1, 400 #5f7fbd, 500 #3d5fa3, 600 #2b4a86, 700 #1f3a6b, 800 #172c52 (boutons principaux), 900 #10203c (barre latérale), 950 #0a1528.
- Accent : cyan #17b8de (hover #0f93b3) pour l'action mise en avant et les indicateurs positifs discrets.
- Fond de page #f4f6fa, cartes blanches, bordures slate-200, texte principal #0f172a, texte secondaire slate-600.
- Sémantique : vert (payé, envoyé, configuré), orange (à faire, partiel, non configuré), rouge (retard, erreur, suppression), bleu (information), violet (IA), cyan (loyers), gris (neutre, brouillon).
- Typographie système (Inter ou équivalent), tailles 14 px pour le corps, 12 px pour les libellés de tableau, titres de page 24 px semi-gras.
- Coins arrondis 8–12 px, ombres très légères, densité moyenne (tableaux lisibles avec beaucoup de lignes). Icônes linéaires (style Lucide), jamais d'emoji dans l'interface.

## Structure générale

Barre latérale fixe à gauche (260 px, fond navy 900, texte blanc/navy 200) avec :
1. Logo « OMNIUP Location » et, en mode multi-entités, un sélecteur d'entité de travail (personne ou société gérée).
2. Navigation groupée :
   - Tableau de bord
   - Patrimoine : Bailleurs, Immeubles, Lots
   - Location : Locataires, Baux, Loyers et quittances, Documents, Modèles de documents
   - Comptabilité : Dépenses, Emprunts, Synthèse annuelle
   - Outils : Calculatrices, Assistant IA
   - Entités (si multi-entités), Paramètres
3. Zone de contenu (max 1 200 px) : en-tête de page (titre, sous-titre, actions à droite), message « flash » de succès/erreur sous l'en-tête, puis cartes ou tableaux.

## Composants du design system

Button (primary navy 800, secondary contour blanc, accent cyan, ghost, danger rouge ; tailles sm/md ; état chargement), Card (en-tête titre + description + actions, corps), PageHeader, Badge (7 tons ci-dessus), Alerte (bleu/vert/orange/rouge avec titre facultatif), EmptyState (titre, description, action), Infos (grille libellé/valeur 1 à 3 colonnes), Tableau (en-tête slate-50, lignes survolées, colonnes montants alignées à droite, ligne cliquable), Stat (KPI : libellé, valeur, détail, ton), Field (libellé, aide, erreur), Input, Select, Textarea, Checkbox, SubmitButton, FormMessage, Flash, Stepper de statut, Dialogue de confirmation de suppression, Zone d'import de fichiers (glisser-déposer, PDF/JPG/PNG, barre de progression), Bulles de chat de l'assistant IA (utilisateur / IA, texte en streaming), Onglets.

## Écrans à produire (avec contenus réalistes)

1. **Connexion** : page simple avec logo, champ mot de passe, bouton « Se connecter », message d'erreur.
2. **Tableau de bord** : 4 KPI (Lots : « 12 » avec « 10 loués, 2 vacants » ; Loyers de septembre 2026 : « 8 640,00 € » avec « 12 appels · encaissé 6 120,00 € » ; Loyers en retard : « 1 250,00 € », 2 échéances, en rouge ; Dépenses 2026 : « 14 380,00 € »). Carte « À faire » (3 avis d'échéance à envoyer, 2 quittances à envoyer, 1 bail en signature, 2 loyers en retard). Carte « Derniers appels de loyer » (tableau). Variante « Premiers pas » quand la base est vide (3 étapes : créer un lot, créer un locataire, créer un bail).
3. **Lots** : liste (nom, immeuble, type Appartement/Maison, surface, loyer, statut Loué/Vacant), bouton « Nouveau lot » ; fiche lot (infos, bail en cours, historique des baux, bailleur) ; formulaire de création.
4. **Locataires** : liste avec statut (Candidat / En place / Ancien) ; fiche avec coordonnées (nom, prénom, adresse, téléphone, email) et « Dossier » : pièces d'identité, avis d'imposition, justificatifs de domicile, justificatifs de revenus, lettre de recommandation, chaque document avec date, aperçu, téléchargement, suppression ; import direct de fichiers.
5. **Baux** : liste (lot, locataire, type Non meublé / Meublé / Mobilité, début, fin, loyer, statut) ; fiche bail avec stepper Brouillon → En signature → Signé → Terminé ; actions : Générer le contrat, Envoyer en signature (Omniup Sign), Marquer signé, Réviser le loyer (IRL, annuelle ou triennale), Courrier, Résilier ; onglets Contrat / Loyers / Courriers / Révisions ; formulaire de création (type, lot, locataire, dates, loyer hors charges, charges, dépôt de garantie, indice de référence).
6. **Loyers et quittances** : filtres (période, statut, lot), tableau (Période, Lot / locataire, Échéance, Montant, Réglé, Statut Payé / Partiel / En attente / En retard, Avis « Envoyé le 21/08/2026 » ou « À envoyer », Quittance) ; fiche d'un appel de loyer : détail (loyer HC, charges, total, prorata), paiements enregistrés (virement, prélèvement, chèque, espèces), formulaire « Enregistrer un paiement », boutons « Avis PDF », « Quittance PDF », « Envoyer par email ».
7. **Dépenses** : liste par immeuble et par catégorie (Réparation, Entretien, Gestion locative, Copropriété, Assurance PNO, Taxe foncière, Autre) avec facture jointe ; formulaire ; totaux par immeuble.
8. **Emprunts** : liste des prêts ; fiche avec import d'échéancier (CSV, PDF ou photo lus par OCR), tableau des échéances (date, capital, intérêts, assurance), total des intérêts de l'année.
9. **Synthèse annuelle** : sélecteur d'année, tableau recettes (loyers, charges), dépenses par catégorie, intérêts d'emprunt, résultat par immeuble, bouton « Exporter en Excel ».
10. **Modèles de documents** : bibliothèque de 26 modèles groupés (baux, avenants, renouvellements, congés et résiliations, cautionnement, conventions, location-gérance, domiciliation), badge « Par défaut » ou « Personnalisé », actions Dupliquer / Modifier / Réinitialiser ; éditeur de modèle avec panneau des variables ({{bail.loyerHC}}, {{locataire.nomComplet}}…).
11. **Documents** : liste des documents générés (titre, bail, date, statut Brouillon / Envoyé) ; éditeur d'un document avec bouton « Adapter avec l'IA » (champ de consigne), « Télécharger le PDF », « Envoyer par email ».
12. **Calculatrices** : onglets Pourcentages de loyer, Révision par indice, Rentabilité, Frais de notaire, Capacité d'emprunt, Mensualité, Prêt in fine ; chaque onglet avec un formulaire à gauche et le résultat instantané à droite (chiffres clés + tableau si utile).
13. **Assistant IA** : chat plein écran, suggestions de départ (« Rédige un courrier de relance », « Explique la révision IRL »), réponses en streaming, bouton « Enregistrer comme document », indication de l'entité de travail.
14. **Entités** : liste des entités (personne / société, nombre de lots), création, sélection de l'entité de travail, activation du mode multi-entités.
15. **Paramètres** : cartes d'état avec badge Configuré / Non configuré : Entité, Multi-entités, Stockage des fichiers (Scaleway), Envoi d'emails (Resend), Appels de loyer automatiques, Assistant IA (Anthropic), OCR (Mistral), Omniup Sign ; formulaire d'email de test.

## États et règles

- Prévoir pour chaque liste : état vide (EmptyState avec action), état chargé, filtres, pagination simple.
- Formulaires : erreurs par champ, message global, bouton d'envoi avec état « Enregistrement… ».
- Suppressions : dialogue de confirmation.
- Accessibilité : contrastes AA, focus visible, tailles cliquables ≥ 40 px, libellés explicites.
- Responsive : sur mobile, barre latérale en tiroir, tableaux transformés en cartes empilées.

## Livrables attendus

1. Le design system (tokens, typographie, composants listés) documenté.
2. Les 15 écrans ci-dessus en version desktop, plus le tableau de bord, la liste des loyers et la fiche bail en version mobile.
3. Un prototype navigable reliant la barre latérale à chaque écran et le parcours « créer un bail → appel de loyer → paiement → quittance ».
