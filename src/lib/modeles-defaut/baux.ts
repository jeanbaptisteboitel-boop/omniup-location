import type { ModeleDefaut } from "../modeles";

const SIGNATURES = `## Signatures

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires originaux, dont un remis à chaque partie.

Le bailleur — {{bailleur.nom}} : signature précédée de la mention « Lu et approuvé »

Le locataire — {{locataire.nomComplet}} : signature précédée de la mention « Lu et approuvé »`;

const ANNEXES_HABITATION = `## Annexes

- Notice d'information relative aux droits et obligations des locataires et des bailleurs (arrêté du 29 mai 2015).
- Dossier de diagnostic technique : diagnostic de performance énergétique, constat de risque d'exposition au plomb (immeuble construit avant 1949), état des risques et pollutions, état de l'installation intérieure d'électricité et de gaz (installations de plus de 15 ans), diagnostic amiante tenu à disposition.
- État des lieux d'entrée établi contradictoirement lors de la remise des clés.
- Extrait du règlement de copropriété concernant la destination de l'immeuble, la jouissance et l'usage des parties privatives et communes (le cas échéant).
- Attestation d'assurance contre les risques locatifs remise par le locataire.`;

export const MODELES_BAUX: ModeleDefaut[] = [
  {
    code: "bail-habitation-vide",
    nom: "Bail d'habitation — logement vide (résidence principale)",
    categorie: "BAIL",
    description: "Contrat type conforme au décret n° 2015-587 du 29 mai 2015 pour un logement loué vide à titre de résidence principale (loi du 6 juillet 1989, titre Ier).",
    contenu: `# Contrat de location de logement nu à usage de résidence principale

Le présent contrat est soumis au titre Ier de la loi n° 89-462 du 6 juillet 1989 tendant à améliorer les rapports locatifs et au décret n° 2015-587 du 29 mai 2015 relatif aux contrats types de location.

## I. Désignation des parties

Le bailleur : {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, demeurant {{bailleur.adresse}}, email {{bailleur.email}}, téléphone {{bailleur.telephone}}.

Le locataire : {{locataire.nomComplet}}, né(e) le {{locataire.dateNaissance}}, demeurant {{locataire.adresse}}, email {{locataire.email}}, téléphone {{locataire.telephone}}.

## II. Objet du contrat

Le bailleur donne en location au locataire, qui accepte, le logement ci-après désigné, à usage exclusif d'habitation et de résidence principale du locataire.

- Adresse : {{lot.adresse}} ; désignation : {{lot.designation}} ({{lot.type}}, {{lot.etage}}).
- Type d'habitat : [À COMPLÉTER : immeuble collectif ou individuel] ; régime juridique : [À COMPLÉTER : copropriété ou monopropriété] ; période de construction : [À COMPLÉTER].
- Surface habitable : {{lot.surface}} m² ; nombre de pièces principales : {{lot.pieces}}.
- Éléments d'équipement et description : {{lot.description}}.
- Modalités de production de chauffage et d'eau chaude sanitaire : [À COMPLÉTER : individuel ou collectif, énergie].
- Locaux et équipements accessoires à usage privatif : [À COMPLÉTER : cave, parking, jardin, balcon] ; parties et équipements communs : [À COMPLÉTER : ascenseur, local vélos, espaces verts].
- Le logement est loué non meublé.

## III. Date de prise d'effet et durée du contrat

Le contrat prend effet le {{bail.dateDebut}} pour une durée de {{bail.dureeMois}} mois, soit jusqu'au {{bail.dateFin}}. Cette durée est de trois ans au minimum lorsque le bailleur est une personne physique ou une société civile familiale, et de six ans lorsqu'il est une personne morale (article 10 de la loi du 6 juillet 1989).

À défaut de congé donné dans les conditions de l'article 15 de la loi, le contrat est reconduit tacitement pour la même durée et aux mêmes conditions. Le locataire peut donner congé à tout moment avec un préavis de trois mois, réduit à un mois dans les cas prévus par la loi (zone tendue, mutation, perte d'emploi, état de santé, bénéficiaire du RSA ou de l'AAH, attribution d'un logement social). Le bailleur ne peut donner congé que pour l'échéance du contrat, avec un préavis de six mois, pour reprendre le logement, le vendre ou pour un motif légitime et sérieux.

## IV. Conditions financières

### Loyer

Le loyer mensuel est fixé à {{bail.loyerHC}} ({{bail.loyerHCLettres}}) hors charges. [À COMPLÉTER si le logement est situé en zone tendue : loyer de référence, loyer de référence majoré, complément de loyer, montant du dernier loyer acquitté par le précédent locataire et date de son versement.]

Le loyer est payable mensuellement et d'avance, le {{bail.jourEcheance}} de chaque mois, par virement sur le compte du bailleur (IBAN {{bailleur.iban}}) ou par tout autre moyen convenu. Le bailleur remet gratuitement une quittance au locataire qui en fait la demande.

### Révision du loyer

Le loyer sera révisé chaque année à la date anniversaire du contrat, en fonction de la variation de l'indice de référence des loyers publié par l'INSEE. L'indice de référence est celui du {{bail.irlTrimestre}}, soit {{bail.irlValeur}}. La révision ne peut excéder la variation de l'indice sur un an ; elle ne produit effet que pour l'avenir et, à défaut de demande dans l'année qui suit sa date de prise d'effet, la révision de l'année écoulée est perdue (article 17-1 de la loi).

### Charges récupérables

Les charges récupérables, dont la liste est fixée par le décret n° 87-713 du 26 août 1987, donnent lieu au versement d'une provision mensuelle de {{bail.charges}} ({{bail.chargesRegime}}). La régularisation intervient au moins une fois par an sur la base des dépenses réelles ; un mois avant, le bailleur communique le décompte par nature de charges et, en copropriété, le mode de répartition, et tient les justificatifs à disposition pendant six mois.

### Dépôt de garantie

Un dépôt de garantie de {{bail.depotGarantie}} ({{bail.depotGarantieLettres}}), qui ne peut excéder un mois de loyer hors charges, est versé à la signature. Il est restitué dans un délai d'un mois à compter de la remise des clés si l'état des lieux de sortie est conforme à l'état des lieux d'entrée, et de deux mois dans le cas contraire, déduction faite des sommes restant dues au bailleur, sous réserve de leur justification.

### Colocation

[À COMPLÉTER si plusieurs locataires : clause de solidarité et d'indivisibilité entre colocataires et cautions, cessant au plus tard six mois après le congé de l'un d'eux si aucun nouveau colocataire ne figure au bail (article 8-1 de la loi).]

## V. Travaux

[À COMPLÉTER : travaux d'amélioration ou de mise en conformité réalisés par le bailleur avant l'entrée dans les lieux, ou travaux que le locataire est autorisé à réaliser avec, le cas échéant, leur imputation sur le loyer.] Le locataire ne peut transformer les lieux sans l'accord écrit du bailleur. Le bailleur est tenu des réparations autres que locatives et de l'entretien des équipements ; le locataire est tenu de l'entretien courant et des réparations locatives (décret n° 87-712 du 26 août 1987).

## VI. Obligations des parties

Le bailleur s'oblige à délivrer un logement décent et en bon état d'usage, à assurer la jouissance paisible du logement, à entretenir les locaux et à remettre gratuitement quittance. Le locataire s'oblige à payer le loyer et les charges aux termes convenus, à user paisiblement des lieux suivant leur destination, à répondre des dégradations survenues pendant la location, à laisser exécuter les travaux nécessaires, à ne pas céder le bail ni sous-louer sans accord écrit du bailleur, et à s'assurer contre les risques locatifs (incendie, dégât des eaux) en justifiant chaque année de cette assurance ; à défaut, le bailleur peut souscrire une assurance pour son compte et en récupérer la prime majorée.

## VII. Clause résolutoire

Le contrat sera résilié de plein droit, si bon semble au bailleur, deux mois après un commandement de payer resté infructueux, en cas de défaut de paiement du loyer, des charges ou du dépôt de garantie, ou de non-souscription de l'assurance des risques locatifs (un mois dans ce dernier cas), ainsi qu'en cas de troubles de voisinage constatés par décision de justice, conformément à l'article 24 de la loi du 6 juillet 1989.

## VIII. Honoraires

[À COMPLÉTER : montant des honoraires de visite, constitution du dossier, rédaction du bail et état des lieux, partagés entre bailleur et locataire dans les limites de l'article 5 de la loi, ou mention « néant » si le bail est conclu sans intermédiaire.]

## IX. Autres conditions particulières

[À COMPLÉTER : conditions particulières convenues entre les parties, dans le respect de l'article 4 de la loi du 6 juillet 1989 (clauses réputées non écrites).]

${ANNEXES_HABITATION}

${SIGNATURES}`,
  },
  {
    code: "bail-meuble",
    nom: "Bail d'appartement meublé (résidence principale)",
    categorie: "BAIL",
    description: "Contrat type pour un logement meublé loué à titre de résidence principale (loi du 6 juillet 1989, titre Ier bis) : un an, ou neuf mois pour un étudiant.",
    contenu: `# Contrat de location de logement meublé à usage de résidence principale

Le présent contrat est soumis au titre Ier bis de la loi n° 89-462 du 6 juillet 1989 et au décret n° 2015-587 du 29 mai 2015 relatif aux contrats types de location. Le logement est équipé d'un mobilier en nombre et en qualité suffisants pour permettre au locataire d'y dormir, manger et vivre convenablement au regard des exigences de la vie courante (décret n° 2015-981 du 31 juillet 2015).

## I. Désignation des parties

Le bailleur : {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, demeurant {{bailleur.adresse}}, email {{bailleur.email}}.

Le locataire : {{locataire.nomComplet}}, né(e) le {{locataire.dateNaissance}}, demeurant {{locataire.adresse}}, email {{locataire.email}}, téléphone {{locataire.telephone}}.

## II. Objet du contrat

Logement meublé situé {{lot.adresse}} — {{lot.designation}} ({{lot.type}}, {{lot.etage}}), surface habitable {{lot.surface}} m², {{lot.pieces}} pièce(s) principale(s). Description et équipements : {{lot.description}}. Modalités de chauffage et d'eau chaude : [À COMPLÉTER]. Locaux accessoires : [À COMPLÉTER]. Le logement constitue la résidence principale du locataire.

## III. Durée

Le contrat prend effet le {{bail.dateDebut}} pour une durée de {{bail.dureeMois}} mois, jusqu'au {{bail.dateFin}} : un an au minimum, reconduit tacitement pour un an à défaut de congé (article 25-7 de la loi). [Variante étudiant : durée de neuf mois sans reconduction tacite, le locataire justifiant de sa qualité d'étudiant.]

Le locataire peut résilier le contrat à tout moment avec un préavis d'un mois. Le bailleur peut donner congé pour le terme du contrat avec un préavis de trois mois, en justifiant d'une reprise, d'une vente ou d'un motif légitime et sérieux.

## IV. Conditions financières

Loyer mensuel hors charges : {{bail.loyerHC}} ({{bail.loyerHCLettres}}), payable d'avance le {{bail.jourEcheance}} de chaque mois sur le compte IBAN {{bailleur.iban}}. [À COMPLÉTER en zone tendue : loyer de référence majoré et, le cas échéant, complément de loyer.]

Révision annuelle du loyer à la date anniversaire selon l'indice de référence des loyers ; indice de référence : {{bail.irlTrimestre}}, valeur {{bail.irlValeur}} (article 17-1 de la loi).

Charges : {{bail.charges}} par mois, {{bail.chargesRegime}}. En cas de forfait, celui-ci ne peut être manifestement disproportionné au regard des charges dont le locataire ou le précédent locataire se serait acquitté.

Dépôt de garantie : {{bail.depotGarantie}} ({{bail.depotGarantieLettres}}), limité à deux mois de loyer hors charges, restitué dans le délai d'un mois après remise des clés si l'état des lieux de sortie est conforme, deux mois sinon, déduction faite des sommes justifiées restant dues.

## V. Mobilier et état des lieux

Un inventaire et un état détaillé du mobilier sont établis contradictoirement à l'entrée et à la sortie et annexés au contrat. Le mobilier comprend au minimum : literie avec couette ou couverture, dispositif d'occultation des fenêtres dans les chambres, plaques de cuisson, four ou four à micro-ondes, réfrigérateur et congélateur ou compartiment à congélation, vaisselle et ustensiles de cuisine en nombre suffisant, table et sièges, étagères de rangement, luminaires, matériel d'entretien ménager adapté au logement.

## VI. Obligations des parties, travaux et clause résolutoire

Les obligations du bailleur et du locataire sont celles des articles 6 et 7 de la loi du 6 juillet 1989 : logement décent, jouissance paisible, entretien et réparations, paiement du loyer, usage paisible, assurance des risques locatifs justifiée chaque année, interdiction de céder le bail ou de sous-louer sans accord écrit. Le contrat sera résilié de plein droit, deux mois après un commandement de payer demeuré infructueux, en cas de défaut de paiement du loyer, des charges ou du dépôt de garantie, ou de défaut d'assurance (un mois), conformément à l'article 24 de la loi.

## VII. Honoraires et conditions particulières

[À COMPLÉTER : honoraires d'intermédiaire ou « néant » ; clause de solidarité en cas de colocation ; autres conditions particulières.]

${ANNEXES_HABITATION}
- Inventaire et état détaillé du mobilier.

${SIGNATURES}`,
  },
  {
    code: "bail-mobilite",
    nom: "Bail mobilité (logement meublé, 1 à 10 mois)",
    categorie: "BAIL",
    description: "Bail mobilité du titre Ier ter de la loi du 6 juillet 1989 (articles 25-12 à 25-18) : locataire en formation, études, stage, apprentissage, service civique, mutation ou mission temporaire.",
    contenu: `# Bail mobilité

Le présent contrat est un bail mobilité soumis au titre Ier ter de la loi n° 89-462 du 6 juillet 1989 (articles 25-12 à 25-18). Il ne peut être conclu qu'avec un locataire justifiant, à la date de prise d'effet, être en formation professionnelle, en études supérieures, en contrat d'apprentissage, en stage, en engagement volontaire dans le cadre d'un service civique, en mutation professionnelle ou en mission temporaire dans le cadre de son activité professionnelle.

## I. Parties

Le bailleur : {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, demeurant {{bailleur.adresse}}, email {{bailleur.email}}.

Le locataire : {{locataire.nomComplet}}, né(e) le {{locataire.dateNaissance}}, demeurant {{locataire.adresse}}, email {{locataire.email}}, téléphone {{locataire.telephone}}.

Motif justifiant le recours au bail mobilité : {{bail.motifMobilite}}. Le locataire fournit le justificatif correspondant (attestation de formation, convention de stage, certificat de scolarité, lettre de mutation, ordre de mission), annexé au présent contrat.

## II. Logement

Logement meublé situé {{lot.adresse}} — {{lot.designation}} ({{lot.type}}, {{lot.etage}}), surface habitable {{lot.surface}} m², {{lot.pieces}} pièce(s) principale(s). Description, équipements et mobilier : {{lot.description}} ; inventaire annexé. Modalités de chauffage et d'eau chaude : [À COMPLÉTER].

## III. Durée

Le bail prend effet le {{bail.dateDebut}} pour une durée de {{bail.dureeMois}} mois, jusqu'au {{bail.dateFin}}, comprise entre un et dix mois. Il n'est ni renouvelable ni reconductible. La durée peut être modifiée une fois par avenant sans que la durée totale puisse excéder dix mois. Si, au terme, les parties concluent un nouveau bail pour le même logement, celui-ci est soumis au titre Ier bis de la loi (bail meublé de droit commun).

Le locataire peut résilier le contrat à tout moment avec un préavis d'un mois. Le bailleur ne peut pas donner congé avant le terme.

## IV. Conditions financières

Loyer mensuel : {{bail.loyerHC}} ({{bail.loyerHCLettres}}) hors charges, payable d'avance le {{bail.jourEcheance}} de chaque mois sur le compte IBAN {{bailleur.iban}}. Le loyer n'est pas révisable en cours de bail. [À COMPLÉTER en zone tendue : loyer de référence majoré.]

Charges : forfait mensuel de {{bail.charges}}, versé avec le loyer, sans régularisation, fixé en fonction des montants exigibles par le bailleur pour les logements comparables.

Aucun dépôt de garantie ne peut être exigé (article 25-14 de la loi). Le bailleur peut demander une caution solidaire ou bénéficier de la garantie Visale.

## V. Obligations et clause résolutoire

Les obligations des parties sont celles des articles 6 et 7 de la loi du 6 juillet 1989. Le locataire souscrit une assurance contre les risques locatifs. Le contrat sera résilié de plein droit deux mois après un commandement de payer infructueux en cas de défaut de paiement du loyer ou des charges, ou de défaut d'assurance, dans les conditions de l'article 24 de la loi. Cession et sous-location sont interdites.

## VI. Mentions obligatoires

Le présent contrat mentionne expressément qu'il est un bail mobilité soumis au titre Ier ter de la loi du 6 juillet 1989 et indique le motif du locataire ; à défaut de ces mentions, il est soumis au titre Ier bis de la loi. Sont annexés : la notice d'information, le dossier de diagnostic technique, l'état des lieux et l'inventaire du mobilier, le justificatif de la situation du locataire.

${SIGNATURES}`,
  },
  {
    code: "bail-commercial",
    nom: "Bail commercial (3-6-9)",
    categorie: "BAIL",
    description: "Bail commercial soumis au statut des baux commerciaux (articles L145-1 et suivants du Code de commerce) : neuf ans, faculté triennale du preneur, indexation ILC, inventaire des charges.",
    contenu: `# Bail commercial

Entre les soussignés :

{{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, SIREN {{bailleur.siren}}, ci-après « le bailleur »,

et {{locataire.nomComplet}}, [À COMPLÉTER : forme sociale, capital, siège, SIREN, représentant], {{locataire.adresse}}, ci-après « le preneur »,

il a été convenu un bail commercial soumis aux articles L145-1 et suivants et R145-1 et suivants du Code de commerce.

## Article 1 – Désignation des locaux

Locaux situés {{lot.adresse}} — {{lot.designation}} ({{lot.etage}}), d'une surface d'environ {{lot.surface}} m², comprenant : {{lot.description}}. [À COMPLÉTER : lots de copropriété, dépendances, places de stationnement, parties communes accessibles.] Le preneur déclare bien connaître les lieux pour les avoir visités.

## Article 2 – Destination

Les locaux sont loués pour l'exercice exclusif de l'activité suivante : [À COMPLÉTER : activité précise]. Toute activité connexe ou complémentaire, ou tout changement d'activité, relève de la procédure de déspécialisation des articles L145-47 et suivants du Code de commerce. Le preneur s'engage à exploiter en respectant la destination de l'immeuble et le règlement de copropriété.

## Article 3 – Durée

Le bail est consenti pour neuf années entières et consécutives à compter du {{bail.dateDebut}}, pour se terminer le {{bail.dateFin}}. Le preneur peut donner congé à l'expiration de chaque période triennale, par lettre recommandée avec accusé de réception ou par acte de commissaire de justice, au moins six mois à l'avance (article L145-4). Le bailleur ne peut mettre fin au bail à l'expiration d'une période triennale que dans les cas prévus par la loi (construction, reconstruction, surélévation, travaux de restauration). À l'expiration, le preneur bénéficie du droit au renouvellement ou, à défaut, d'une indemnité d'éviction dans les conditions des articles L145-8 et suivants.

## Article 4 – Loyer

Le loyer annuel est fixé à [À COMPLÉTER : montant annuel hors taxes et hors charges], soit {{bail.loyerHC}} par mois hors charges, payable [À COMPLÉTER : trimestriellement ou mensuellement] d'avance, le {{bail.jourEcheance}} de chaque échéance, sur le compte IBAN {{bailleur.iban}}. [À COMPLÉTER : option du bailleur pour l'assujettissement du loyer à la TVA (article 260, 2° du Code général des impôts) ; franchise ou palier de loyer éventuel.]

## Article 5 – Indexation et révision

Le loyer sera indexé de plein droit chaque année, à la date anniversaire du bail, en fonction de la variation de l'indice des loyers commerciaux (ILC) publié par l'INSEE, l'indice de base étant celui du [À COMPLÉTER : trimestre], soit [À COMPLÉTER : valeur]. En application de l'article L145-39 du Code de commerce, si le jeu de la clause fait varier le loyer de plus d'un quart par rapport au prix précédemment fixé, chaque partie peut demander sa révision ; la variation issue de la clause ne peut excéder 10 % du loyer acquitté l'année précédente. Les parties conservent la faculté de demander la révision triennale légale de l'article L145-38.

## Article 6 – Dépôt de garantie

Le preneur verse un dépôt de garantie de {{bail.depotGarantie}} ({{bail.depotGarantieLettres}}), correspondant à [À COMPLÉTER : nombre] terme(s) de loyer hors charges, restitué en fin de bail après restitution des locaux et apurement des comptes. En application de l'article L145-40, toute somme versée d'avance excédant deux termes de loyer porte intérêt au profit du preneur au taux pratiqué par la Banque de France pour les avances sur titres.

## Article 7 – Charges, impôts et taxes

Conformément à l'article L145-40-2 du Code de commerce, l'inventaire précis et limitatif des catégories de charges, impôts, taxes et redevances liés au bail, avec leur répartition entre bailleur et preneur, figure en annexe. Ne peuvent être imputés au preneur (article R145-35) : les dépenses de grosses réparations de l'article 606 du Code civil, les honoraires de gestion des loyers, les impôts dont le redevable légal est le bailleur (à l'exception de la taxe foncière et de ses taxes additionnelles, qui sont récupérées), ni les travaux de mise en conformité relevant des grosses réparations. Le bailleur communique chaque année un état récapitulatif des charges et, tous les trois ans, un état prévisionnel et un récapitulatif des travaux.

## Article 8 – État des lieux, entretien et travaux

Un état des lieux est établi contradictoirement à la prise de possession et à la restitution (article L145-40-1). Le preneur entretient les locaux en bon état de réparations locatives et d'entretien ; le bailleur supporte les grosses réparations de l'article 606 du Code civil et la vétusté. Le preneur ne peut réaliser de travaux modifiant la structure ou la distribution sans autorisation écrite ; les aménagements deviennent la propriété du bailleur en fin de bail sans indemnité, sauf convention contraire.

## Article 9 – Cession, sous-location, nantissement

Le preneur ne peut céder son droit au bail qu'à l'acquéreur de son fonds de commerce, le bailleur étant appelé à l'acte ; toute autre cession et toute sous-location sont interdites sauf accord écrit du bailleur. [À COMPLÉTER : garantie solidaire du cédant limitée à trois ans (article L145-16-2).]

## Article 10 – Assurances et responsabilité

Le preneur assure les locaux et son activité (incendie, dégâts des eaux, responsabilité civile, recours des voisins) et en justifie chaque année. Le bailleur assure l'immeuble ; la prime est [À COMPLÉTER : récupérée ou non] auprès du preneur.

## Article 11 – Clause résolutoire

À défaut de paiement d'un seul terme de loyer ou de charges à son échéance, ou d'exécution d'une clause du bail, et un mois après un commandement demeuré infructueux visant la présente clause, le bail sera résilié de plein droit si bon semble au bailleur (article L145-41). Le juge peut accorder des délais et suspendre les effets de la clause.

## Article 12 – Dispositions diverses

Diagnostics annexés : diagnostic de performance énergétique, état des risques et pollutions, diagnostic amiante, annexe environnementale pour les surfaces de plus de 2 000 m². Frais et droits d'enregistrement : à la charge du preneur. Élection de domicile dans les locaux loués pour le preneur et au domicile du bailleur. Tout litige relève du tribunal judiciaire du lieu de situation de l'immeuble.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en autant d'exemplaires que de parties.

Le bailleur : {{bailleur.nom}} — Le preneur : {{locataire.nomComplet}}`,
  },
  {
    code: "bail-professionnel",
    nom: "Bail professionnel (professions libérales)",
    categorie: "BAIL",
    description: "Bail de locaux à usage exclusivement professionnel (article 57 A de la loi n° 86-1290 du 23 décembre 1986) : six ans minimum, congé du locataire à tout moment avec six mois de préavis.",
    contenu: `# Bail professionnel

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, [À COMPLÉTER : profession, forme d'exercice, SIREN], {{locataire.adresse}}, « le locataire », il est conclu un bail soumis à l'article 57 A de la loi n° 86-1290 du 23 décembre 1986 et aux articles 1713 et suivants du Code civil.

## Article 1 – Locaux

Locaux situés {{lot.adresse}} — {{lot.designation}} ({{lot.etage}}), surface d'environ {{lot.surface}} m², comprenant : {{lot.description}}. [À COMPLÉTER : dépendances, stationnement, parties communes.]

## Article 2 – Destination

Les locaux sont loués à usage exclusivement professionnel pour l'exercice de la profession de [À COMPLÉTER : profession libérale réglementée ou non], à l'exclusion de toute activité commerciale et de toute habitation. Le locataire respecte la destination de l'immeuble et, le cas échéant, le règlement de copropriété.

## Article 3 – Durée et congé

Le bail est conclu pour une durée de {{bail.dureeMois}} mois, au minimum six ans, à compter du {{bail.dateDebut}}, jusqu'au {{bail.dateFin}}. Le locataire peut, à tout moment, notifier son intention de quitter les locaux par lettre recommandée avec accusé de réception ou par acte de commissaire de justice, en respectant un préavis de six mois. Le bailleur ne peut donner congé que pour le terme du bail, avec le même préavis. À défaut de congé, le bail est tacitement reconduit pour six ans.

## Article 4 – Loyer, charges et dépôt de garantie

Loyer mensuel hors charges : {{bail.loyerHC}} ({{bail.loyerHCLettres}}), payable d'avance le {{bail.jourEcheance}} de chaque mois sur le compte IBAN {{bailleur.iban}}. [À COMPLÉTER : option TVA éventuelle.] Le loyer est indexé chaque année à la date anniversaire sur l'indice des loyers des activités tertiaires (ILAT), indice de base [À COMPLÉTER : trimestre et valeur].

Charges : {{bail.charges}} par mois, {{bail.chargesRegime}} ; la liste des charges refacturées figure en annexe. La taxe foncière est [À COMPLÉTER : récupérée ou non].

Dépôt de garantie : {{bail.depotGarantie}} ({{bail.depotGarantieLettres}}), restitué dans les deux mois de la restitution des locaux, déduction faite des sommes justifiées restant dues.

## Article 5 – Entretien, travaux et état des lieux

Un état des lieux contradictoire est établi à l'entrée et à la sortie. Le locataire supporte l'entretien courant et les réparations locatives ; le bailleur supporte les grosses réparations de l'article 606 du Code civil. Aucun travaux touchant à la structure ou à la distribution sans accord écrit du bailleur.

## Article 6 – Cession et sous-location

Le locataire peut céder le bail ou sous-louer avec l'accord préalable et écrit du bailleur, qui ne peut être refusé sans motif légitime lorsque le cessionnaire exerce la même profession. [À COMPLÉTER : conditions.]

## Article 7 – Assurances, clause résolutoire et dispositions diverses

Le locataire assure les locaux et son activité et en justifie chaque année. À défaut de paiement d'un terme ou d'exécution d'une clause, un mois après un commandement ou une mise en demeure restés infructueux, le bail sera résilié de plein droit si bon semble au bailleur. Diagnostics annexés : DPE, état des risques et pollutions, amiante. Frais d'enregistrement éventuels à la charge du locataire.

${SIGNATURES}`,
  },
  {
    code: "bail-derogatoire",
    nom: "Bail dérogatoire de courte durée (bail précaire commercial)",
    categorie: "BAIL",
    description: "Bail de locaux commerciaux d'une durée totale maximale de trois ans, échappant au statut des baux commerciaux (article L145-5 du Code de commerce).",
    contenu: `# Bail dérogatoire de courte durée

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, [À COMPLÉTER : forme sociale, SIREN, représentant], {{locataire.adresse}}, « le preneur ».

## Article 1 – Renonciation au statut des baux commerciaux

En application de l'article L145-5 du Code de commerce, les parties conviennent expressément que le présent bail, d'une durée au plus égale à trois ans, est conclu en dehors du statut des baux commerciaux. Le preneur déclare avoir connaissance de cette renonciation et de ses conséquences : absence de droit au renouvellement et d'indemnité d'éviction. Si, à l'expiration de la durée convenue, le preneur reste et est laissé en possession, il s'opère un nouveau bail soumis au statut. Les parties ne peuvent conclure de nouveau bail dérogatoire pour les mêmes locaux au-delà d'une durée cumulée de trois ans.

## Article 2 – Locaux et destination

Locaux situés {{lot.adresse}} — {{lot.designation}}, surface d'environ {{lot.surface}} m² : {{lot.description}}. Destination : [À COMPLÉTER : activité exercée]. Un état des lieux est établi contradictoirement à l'entrée et à la sortie, conformément à l'article L145-5.

## Article 3 – Durée

Le bail est consenti du {{bail.dateDebut}} au {{bail.dateFin}}, soit {{bail.dureeMois}} mois, sans tacite reconduction. Le preneur s'engage à libérer les lieux au terme sans mise en demeure. [À COMPLÉTER : faculté de résiliation anticipée par le preneur avec préavis.]

## Article 4 – Loyer, charges et dépôt de garantie

Loyer mensuel : {{bail.loyerHC}} hors charges, payable d'avance le {{bail.jourEcheance}} de chaque mois (IBAN {{bailleur.iban}}). Charges : {{bail.charges}} par mois, {{bail.chargesRegime}}. Dépôt de garantie : {{bail.depotGarantie}}, restitué dans les deux mois de la restitution des locaux, déduction faite des sommes dues.

## Article 5 – Obligations, assurances et clause résolutoire

Le preneur entretient les locaux, en use conformément à leur destination, ne peut céder le bail ni sous-louer, assure son activité et les locaux, et restitue les lieux en bon état. À défaut de paiement d'un terme ou d'exécution d'une clause, un mois après mise en demeure infructueuse, le bail est résilié de plein droit si bon semble au bailleur.

${SIGNATURES}`,
  },
  {
    code: "bail-garage-parking",
    nom: "Bail de location de garage ou de parking",
    categorie: "BAIL",
    description: "Location d'un garage, box ou emplacement de stationnement indépendant d'un logement (Code civil, articles 1713 et suivants).",
    contenu: `# Contrat de location d'un garage ou emplacement de stationnement

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, {{locataire.adresse}}, téléphone {{locataire.telephone}}, « le locataire ».

Le présent contrat, indépendant de toute location de logement, est soumis aux articles 1713 et suivants du Code civil et n'est pas régi par la loi du 6 juillet 1989.

## Article 1 – Désignation

[À COMPLÉTER : garage fermé, box ou emplacement extérieur] n° [À COMPLÉTER] situé {{lot.adresse}} — {{lot.designation}}, [À COMPLÉTER : niveau, dimensions, accès (badge, télécommande, clé)].

## Article 2 – Destination

L'emplacement est destiné exclusivement au stationnement d'un véhicule [À COMPLÉTER : automobile, deux-roues, utilitaire]. Sont interdits le stockage de marchandises ou de produits dangereux, les travaux mécaniques, le lavage et toute activité professionnelle. Le locataire respecte le règlement de copropriété et les consignes d'accès.

## Article 3 – Durée

Le contrat prend effet le {{bail.dateDebut}} pour une durée de {{bail.dureeMois}} mois, jusqu'au {{bail.dateFin}}, renouvelable par tacite reconduction par périodes de même durée. Chaque partie peut y mettre fin à tout moment par lettre recommandée avec accusé de réception moyennant un préavis d'un mois.

## Article 4 – Loyer, charges et dépôt de garantie

Loyer mensuel : {{bail.loyerHC}} ({{bail.loyerHCLettres}}), payable d'avance le {{bail.jourEcheance}} de chaque mois (IBAN {{bailleur.iban}}). Charges : {{bail.charges}} par mois ({{bail.chargesRegime}}). Le loyer est révisable chaque année selon [À COMPLÉTER : indice ou pourcentage]. Dépôt de garantie : {{bail.depotGarantie}}, restitué dans le mois de la restitution des lieux et des moyens d'accès, déduction faite des sommes dues.

## Article 5 – Obligations

Le locataire maintient l'emplacement propre, signale toute dégradation, restitue les clés, badges et télécommandes ([À COMPLÉTER : nombre]) en fin de contrat, et assure son véhicule. Le bailleur assure l'immeuble mais ne répond pas des vols ou dégradations du véhicule et des objets qu'il contient. Aucune cession ni sous-location sans accord écrit du bailleur.

## Article 6 – Clause résolutoire

À défaut de paiement d'un loyer ou de respect de la destination, un mois après mise en demeure restée infructueuse, le contrat est résilié de plein droit si bon semble au bailleur.

${SIGNATURES}`,
  },
  {
    code: "bail-saisonnier",
    nom: "Contrat de location saisonnière (meublé de tourisme)",
    categorie: "BAIL",
    description: "Location meublée de courte durée à une clientèle de passage n'y élisant pas domicile (article L324-1-1 du Code du tourisme, article 1-1 de la loi du 6 juillet 1989), 90 jours consécutifs au maximum.",
    contenu: `# Contrat de location saisonnière

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, email {{bailleur.email}}, téléphone {{bailleur.telephone}}, « le loueur », et {{locataire.nomComplet}}, {{locataire.adresse}}, email {{locataire.email}}, téléphone {{locataire.telephone}}, « le locataire ».

Le présent contrat porte sur la location d'un meublé de tourisme à une clientèle de passage qui n'y élit pas domicile, pour une durée maximale de 90 jours consécutifs, conformément à l'article L324-1-1 du Code du tourisme et à l'article 1-1 de la loi du 6 juillet 1989. [À COMPLÉTER : numéro d'enregistrement en mairie et classement éventuel du meublé.]

## Article 1 – Logement

Meublé situé {{lot.adresse}} — {{lot.designation}} ({{lot.type}}, {{lot.etage}}), {{lot.surface}} m², {{lot.pieces}} pièce(s), pouvant accueillir [À COMPLÉTER : nombre] personnes au maximum. Description, équipements et inventaire : {{lot.description}} ; un état descriptif détaillé et un inventaire sont annexés.

## Article 2 – Durée

Location du [À COMPLÉTER : date et heure d'arrivée] au [À COMPLÉTER : date et heure de départ], soit [À COMPLÉTER : nombre] nuits. Le locataire ne peut se prévaloir d'aucun droit au maintien dans les lieux au terme.

## Article 3 – Prix et modalités de paiement

Prix total du séjour : [À COMPLÉTER : montant], charges (eau, électricité, chauffage) [À COMPLÉTER : comprises ou selon relevé], forfait ménage [À COMPLÉTER], taxe de séjour [À COMPLÉTER : montant par personne et par nuit, reversée à la commune]. Un acompte de [À COMPLÉTER : montant, en général 25 à 30 %] est versé à la réservation ; le solde est payable [À COMPLÉTER : à l'arrivée ou 30 jours avant]. Sauf stipulation contraire, les sommes versées d'avance sont des arrhes au sens de l'article L214-1 du Code de la consommation.

## Article 4 – Dépôt de garantie

Un dépôt de garantie de [À COMPLÉTER : montant] est remis à l'arrivée et restitué dans les [À COMPLÉTER : nombre] jours suivant le départ, déduction faite du coût des dégradations ou objets manquants constatés à l'état des lieux de sortie.

## Article 5 – Annulation

En cas d'annulation par le locataire plus de [À COMPLÉTER] jours avant l'arrivée, l'acompte reste acquis au loueur ; moins de [À COMPLÉTER] jours avant, la totalité du prix est due, sauf relocation. En cas d'annulation par le loueur, il rembourse le double des arrhes versées. [À COMPLÉTER : cas de force majeure.]

## Article 6 – Conditions de séjour

Le logement est réservé à l'usage exclusif du locataire et des personnes déclarées ; toute sous-location ou cession est interdite. Animaux : [À COMPLÉTER : admis ou non]. Le locataire use paisiblement des lieux, respecte le voisinage et le règlement de copropriété, et restitue le logement dans l'état de propreté d'origine. Un état des lieux et un inventaire contradictoires sont établis à l'arrivée et au départ. Le locataire est responsable des dommages qu'il cause et déclare être couvert par une assurance villégiature ou responsabilité civile.

## Article 7 – Litiges

Tout litige relève des juridictions compétentes du lieu de situation du logement. [À COMPLÉTER : médiateur de la consommation si le loueur est professionnel.]

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires.

Le loueur : {{bailleur.nom}} — Le locataire : {{locataire.nomComplet}} (mention « Lu et approuvé »)`,
  },
];
