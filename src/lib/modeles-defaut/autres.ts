import type { ModeleDefaut } from "../modeles";

const ENTETE_COURRIER = `{{bailleur.nom}}
{{bailleur.adresse}}
{{bailleur.email}} — {{bailleur.telephone}}

À l'attention de {{locataire.nomComplet}}
{{lot.adresse}}

[À COMPLÉTER : lieu], le {{date.jour}}
Lettre recommandée avec accusé de réception n° [À COMPLÉTER]`;

const SIGNATURES_AVENANT = `## Dispositions finales

Toutes les autres clauses et conditions du bail initial demeurent inchangées et continuent de s'appliquer. Le présent avenant en fait partie intégrante et lui est annexé.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires originaux.

Le bailleur — {{bailleur.nom}} : signature précédée de la mention « Lu et approuvé »

Le locataire — {{locataire.nomComplet}} : signature précédée de la mention « Lu et approuvé »`;

export const MODELES_AVENANTS: ModeleDefaut[] = [
  {
    code: "avenant-contrat-location",
    nom: "Avenant à un contrat de location (toutes locations)",
    categorie: "AVENANT",
    description: "Avenant générique modifiant une ou plusieurs clauses d'un contrat de location en cours (loyer, durée, parties, désignation, conditions particulières).",
    contenu: `# Avenant n° [À COMPLÉTER] au contrat de location

## Rappel du contrat initial

Contrat de location ({{bail.type}}) conclu le {{bail.dateSignature}} entre {{bailleur.nom}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, « le locataire », portant sur le bien situé {{lot.adresse}} ({{lot.designation}}), avec prise d'effet le {{bail.dateDebut}}, moyennant un loyer mensuel de {{bail.loyerHC}} hors charges et {{bail.charges}} de charges.

## Article 1 – Objet de l'avenant

Les parties conviennent de modifier le contrat initial comme suit à compter du [À COMPLÉTER : date d'effet] :

- [À COMPLÉTER : clause modifiée, par exemple « Article … – Loyer » : nouveau loyer mensuel de … hors charges, nouvelles charges de …]
- [À COMPLÉTER : autre modification : durée, adjonction ou retrait d'un locataire, désignation des lieux, mobilier, conditions particulières]

## Article 2 – Motif

[À COMPLÉTER : motif de la modification (accord des parties, travaux réalisés, changement de situation…).]

${SIGNATURES_AVENANT}`,
  },
  {
    code: "avenant-bail-habitation",
    nom: "Avenant à un bail d'habitation",
    categorie: "AVENANT",
    description: "Modification d'un bail d'habitation soumis à la loi du 6 juillet 1989 : loyer après travaux d'amélioration, ajout ou départ d'un colocataire, changement de bailleur, modalités de paiement.",
    contenu: `# Avenant au contrat de location de logement

## Rappel du bail

Bail d'habitation ({{bail.type}}) conclu le {{bail.dateSignature}} entre {{bailleur.nom}}, « le bailleur », et {{locataire.nomComplet}}, « le locataire », portant sur le logement situé {{lot.adresse}} ({{lot.designation}}, {{lot.surface}} m²), à effet du {{bail.dateDebut}}, moyennant un loyer mensuel de {{bail.loyerHC}} hors charges et {{bail.charges}} de charges ({{bail.chargesRegime}}).

## Article 1 – Modification convenue

[À COMPLÉTER : choisir et compléter la ou les clauses concernées]

- Loyer : en application de l'article 17-1 II de la loi du 6 juillet 1989, à la suite des travaux d'amélioration réalisés par le bailleur ([À COMPLÉTER : nature, montant et date des travaux]), le loyer mensuel hors charges est porté de {{bail.loyerHC}} à [À COMPLÉTER] à compter du [À COMPLÉTER : date]. Cette majoration ne peut être appliquée qu'aux travaux d'amélioration convenus par les parties, distincts des travaux d'entretien et de mise en conformité.
- Colocataire : [À COMPLÉTER : identité] est ajouté(e) au bail en qualité de colocataire solidaire à compter du [À COMPLÉTER] ; ou [À COMPLÉTER : identité] quitte le logement à compter du [À COMPLÉTER], sa solidarité cessant conformément à l'article 8-1 de la loi.
- Bailleur : à la suite de [À COMPLÉTER : vente, donation, succession], le bail se poursuit avec [À COMPLÉTER : nouveau bailleur et adresse], qui reprend l'ensemble des droits et obligations du bailleur, y compris la restitution du dépôt de garantie.
- Modalités de paiement, jour d'échéance ou autres conditions particulières : [À COMPLÉTER].

## Article 2 – Dépôt de garantie

[À COMPLÉTER : le dépôt de garantie reste fixé à {{bail.depotGarantie}} ou est complété de … ; en bail d'habitation vide, il ne peut excéder un mois de loyer hors charges, et deux mois en meublé.]

${SIGNATURES_AVENANT}`,
  },
  {
    code: "avenant-bail-commercial",
    nom: "Avenant à un bail commercial",
    categorie: "AVENANT",
    description: "Avenant à un bail commercial : modification du loyer, extension ou réduction des locaux, déspécialisation partielle, changement de preneur ou de bailleur.",
    contenu: `# Avenant n° [À COMPLÉTER] au bail commercial

## Rappel du bail

Bail commercial conclu le {{bail.dateSignature}} entre {{bailleur.nom}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, « le preneur », portant sur les locaux situés {{lot.adresse}} ({{lot.designation}}), pour neuf années à compter du {{bail.dateDebut}}, moyennant un loyer de {{bail.loyerHC}} par mois hors taxes et hors charges, destination : [À COMPLÉTER : activité autorisée].

## Article 1 – Modifications convenues

[À COMPLÉTER : conserver les clauses utiles]

- Loyer : le loyer est fixé à [À COMPLÉTER : nouveau montant annuel hors taxes] à compter du [À COMPLÉTER], l'indice de base de la clause d'indexation devenant celui du [À COMPLÉTER : trimestre] (ILC ou ILAT, valeur [À COMPLÉTER]). Les parties déclarent que cette fixation résulte de leur libre accord et ne constitue pas une révision au sens de l'article L145-38 du Code de commerce.
- Destination : en application des articles L145-47 (déspécialisation partielle, activités connexes ou complémentaires) ou L145-48 (déspécialisation plénière) du Code de commerce, le bailleur autorise le preneur à exercer en outre l'activité de [À COMPLÉTER] ; [À COMPLÉTER : contrepartie éventuelle].
- Locaux : les locaux loués sont [À COMPLÉTER : étendus à / réduits de] [À COMPLÉTER : désignation], la surface totale étant portée à [À COMPLÉTER] m² ; le loyer et la répartition des charges sont ajustés en conséquence.
- Parties : à la suite de [À COMPLÉTER : cession du fonds, transmission universelle de patrimoine, vente de l'immeuble], le bail se poursuit avec [À COMPLÉTER : nouveau preneur ou nouveau bailleur], qui reprend l'ensemble des droits et obligations ; [À COMPLÉTER : garantie solidaire du cédant, limitée à trois ans conformément à l'article L145-16-2].
- Durée : les parties conviennent [À COMPLÉTER : d'une renonciation à la faculté de résiliation triennale par le preneur dans les cas admis par l'article L145-4, ou d'un nouveau terme].

## Article 2 – Dépôt de garantie et enregistrement

Le dépôt de garantie est [À COMPLÉTER : inchangé, porté à …]. Les frais d'enregistrement éventuels du présent avenant sont à la charge du preneur.

${SIGNATURES_AVENANT}`,
  },
];

export const MODELES_RENOUVELLEMENTS: ModeleDefaut[] = [
  {
    code: "renouvellement-bail",
    nom: "Renouvellement de bail (toutes locations) — avenant de renouvellement",
    categorie: "RENOUVELLEMENT",
    description: "Avenant constatant le renouvellement d'un contrat de location arrivé à terme, avec les conditions du nouveau bail (durée, loyer, charges).",
    contenu: `# Avenant de renouvellement du contrat de location

## Rappel

Contrat de location ({{bail.type}}) conclu le {{bail.dateSignature}} entre {{bailleur.nom}}, « le bailleur », et {{locataire.nomComplet}}, « le locataire », portant sur le bien situé {{lot.adresse}} ({{lot.designation}}), à effet du {{bail.dateDebut}} et venant à échéance le {{bail.dateFin}}.

## Article 1 – Renouvellement

Les parties conviennent de renouveler le contrat à compter du [À COMPLÉTER : date, en principe le lendemain de l'échéance] pour une durée de [À COMPLÉTER : durée], soit jusqu'au [À COMPLÉTER : date], aux conditions ci-après. [Rappel : en bail d'habitation, le bail se reconduit tacitement aux mêmes conditions à défaut de congé ou de proposition de renouvellement ; le présent avenant formalise les nouvelles conditions convenues.]

## Article 2 – Conditions du bail renouvelé

- Loyer mensuel hors charges : [À COMPLÉTER : montant] (précédemment {{bail.loyerHC}}).
- Charges : [À COMPLÉTER : montant et régime] (précédemment {{bail.charges}}, {{bail.chargesRegime}}).
- Indice de référence de la clause de révision : [À COMPLÉTER : indice, trimestre et valeur].
- Dépôt de garantie : {{bail.depotGarantie}}, conservé par le bailleur et reporté sur le bail renouvelé.
- Autres conditions particulières : [À COMPLÉTER].

## Article 3 – Clauses inchangées

Toutes les autres clauses du contrat initial demeurent applicables au bail renouvelé.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires originaux.

Le bailleur — {{bailleur.nom}} : signature « Lu et approuvé »

Le locataire — {{locataire.nomComplet}} : signature « Lu et approuvé »`,
  },
  {
    code: "renouvellement-bail-habitation",
    nom: "Renouvellement de bail d'habitation (logement vide) — proposition de nouveau loyer",
    categorie: "RENOUVELLEMENT",
    description: "Proposition de renouvellement avec réévaluation d'un loyer manifestement sous-évalué, notifiée six mois avant le terme (article 17-2 de la loi du 6 juillet 1989), et contrat de renouvellement.",
    contenu: `# Proposition de renouvellement du bail d'habitation avec nouveau loyer

${ENTETE_COURRIER}

Objet : proposition de renouvellement du bail au terme du {{bail.dateFin}} — article 17-2 de la loi n° 89-462 du 6 juillet 1989

Madame, Monsieur,

Vous occupez le logement situé {{lot.adresse}} ({{lot.designation}}, {{lot.surface}} m²) en vertu d'un bail d'habitation ayant pris effet le {{bail.dateDebut}}, dont le terme est fixé au {{bail.dateFin}}. Le loyer actuel s'élève à {{bail.loyerHC}} par mois hors charges.

Ce loyer étant manifestement sous-évalué au regard des loyers habituellement constatés dans le voisinage pour des logements comparables, je vous propose, en application de l'article 17-2 de la loi du 6 juillet 1989, de renouveler le bail à compter du [À COMPLÉTER : lendemain du terme] pour une durée de [À COMPLÉTER : trois ou six ans], moyennant un loyer mensuel hors charges de [À COMPLÉTER : nouveau loyer].

Cette proposition est justifiée par les références suivantes, portant sur des logements comparables situés dans le même groupe d'immeubles ou dans le voisinage (au moins trois références, six dans les agglomérations de plus d'un million d'habitants) :

- [À COMPLÉTER : adresse, surface, étage, type, époque de construction, loyer hors charges, date du bail]
- [À COMPLÉTER : référence 2]
- [À COMPLÉTER : référence 3]

Conformément à la loi, la hausse résultant de cette proposition s'appliquera par tiers ou par sixième selon la durée du bail et l'ampleur de la hausse. [À COMPLÉTER en zone d'encadrement des loyers : le loyer proposé ne peut excéder le loyer de référence majoré.]

Vous disposez d'un délai de deux mois pour me faire connaître votre réponse. À défaut d'accord ou de réponse quatre mois avant le terme du bail, l'une ou l'autre des parties pourra saisir la commission départementale de conciliation ; à défaut d'accord, le juge pourra être saisi avant le terme. En l'absence de saisine, le bail sera reconduit aux conditions antérieures.

Vous trouverez ci-joint la reproduction des articles 17-2 de la loi du 6 juillet 1989 et le décret fixant la liste des éléments de référence.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{bailleur.nom}}
{{bailleur.representant}}

## Annexe — Contrat de renouvellement (à signer en cas d'accord)

Les parties conviennent du renouvellement du bail d'habitation portant sur le logement situé {{lot.adresse}} à compter du [À COMPLÉTER] pour une durée de [À COMPLÉTER], au loyer mensuel hors charges de [À COMPLÉTER], appliqué selon l'échelonnement légal, les charges restant fixées à {{bail.charges}} ({{bail.chargesRegime}}) et le dépôt de garantie de {{bail.depotGarantie}} étant reporté. Toutes les autres clauses du bail initial demeurent inchangées.

Fait à [À COMPLÉTER], le [À COMPLÉTER], en deux exemplaires. Le bailleur — Le locataire.`,
  },
  {
    code: "renouvellement-bail-meuble",
    nom: "Renouvellement de bail de logement meublé — proposition de nouvelles conditions",
    categorie: "RENOUVELLEMENT",
    description: "Proposition de renouvellement d'un bail meublé avec modification des conditions, notifiée au moins trois mois avant le terme (article 25-8 de la loi du 6 juillet 1989).",
    contenu: `# Proposition de renouvellement du bail meublé

${ENTETE_COURRIER}

Objet : proposition de renouvellement du bail meublé au terme du {{bail.dateFin}} — article 25-8 de la loi n° 89-462 du 6 juillet 1989

Madame, Monsieur,

Vous occupez le logement meublé situé {{lot.adresse}} ({{lot.designation}}) en vertu d'un bail ayant pris effet le {{bail.dateDebut}} et venant à échéance le {{bail.dateFin}}. Le loyer actuel est de {{bail.loyerHC}} par mois hors charges, les charges de {{bail.charges}} ({{bail.chargesRegime}}).

Conformément à l'article 25-8 de la loi du 6 juillet 1989, je vous informe, au moins trois mois avant le terme, de mon souhait de renouveler le bail pour une durée d'un an à compter du [À COMPLÉTER], aux conditions suivantes :

- Loyer mensuel hors charges : [À COMPLÉTER : nouveau loyer], justifié par [À COMPLÉTER : références de loyers de logements meublés comparables du voisinage ; en zone d'encadrement, dans la limite du loyer de référence majoré].
- Charges : [À COMPLÉTER : montant et régime, forfait ou provision].
- Autres conditions : [À COMPLÉTER : mobilier, conditions particulières].

Toutes les autres clauses du bail demeurent inchangées et le dépôt de garantie de {{bail.depotGarantie}} est reporté sur le bail renouvelé.

Je vous remercie de me faire connaître votre accord avant le [À COMPLÉTER : date]. À défaut d'accord, le bail sera reconduit tacitement aux conditions actuelles ou, si l'une des parties le souhaite, la commission départementale de conciliation pourra être saisie du désaccord sur le loyer.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{bailleur.nom}}
{{bailleur.representant}}

## Accord du locataire

Je soussigné(e) {{locataire.nomComplet}} accepte le renouvellement du bail aux conditions ci-dessus à compter du [À COMPLÉTER].

Fait à [À COMPLÉTER], le [À COMPLÉTER]. Signature du locataire.`,
  },
  {
    code: "renouvellement-bail-professionnel",
    nom: "Renouvellement de bail professionnel",
    categorie: "RENOUVELLEMENT",
    description: "Avenant de renouvellement d'un bail professionnel (article 57 A de la loi du 23 décembre 1986) pour une nouvelle période de six ans, avec les conditions renégociées.",
    contenu: `# Avenant de renouvellement du bail professionnel

## Rappel

Bail professionnel conclu le {{bail.dateSignature}} entre {{bailleur.nom}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, « le locataire », portant sur les locaux à usage exclusivement professionnel situés {{lot.adresse}} ({{lot.designation}}, {{lot.surface}} m²), pour une durée de {{bail.dureeMois}} mois à compter du {{bail.dateDebut}}, venant à échéance le {{bail.dateFin}}.

## Article 1 – Renouvellement

Conformément à l'article 57 A de la loi n° 86-1290 du 23 décembre 1986, les parties conviennent expressément de renouveler le bail pour une durée de six années entières à compter du [À COMPLÉTER : lendemain de l'échéance], jusqu'au [À COMPLÉTER]. Le locataire conserve la faculté de donner congé à tout moment avec un préavis de six mois notifié par lettre recommandée avec accusé de réception ou acte de commissaire de justice ; le bailleur ne peut donner congé que pour le terme, avec le même préavis.

## Article 2 – Conditions du bail renouvelé

- Loyer mensuel hors charges : [À COMPLÉTER] (précédemment {{bail.loyerHC}}), [À COMPLÉTER : hors taxes ou toutes taxes selon option TVA].
- Indexation annuelle sur l'indice des loyers des activités tertiaires (ILAT), indice de base : [À COMPLÉTER : trimestre et valeur].
- Charges et taxes récupérées : [À COMPLÉTER] (précédemment {{bail.charges}}, {{bail.chargesRegime}}).
- Dépôt de garantie : {{bail.depotGarantie}}, reporté sur le bail renouvelé [À COMPLÉTER : ou complété à hauteur de …].
- Destination : exercice de la profession de [À COMPLÉTER], inchangée.

## Article 3 – Clauses inchangées

Toutes les autres clauses du bail initial (entretien, travaux, assurances, cession, clause résolutoire) demeurent applicables. Un état des lieux [À COMPLÉTER : est ou n'est pas] établi à l'occasion du renouvellement.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires originaux.

Le bailleur — {{bailleur.nom}} : signature « Lu et approuvé »

Le locataire — {{locataire.nomComplet}} : signature « Lu et approuvé »`,
  },
  {
    code: "renouvellement-bail-commercial",
    nom: "Renouvellement de bail commercial — demande du preneur et réponse du bailleur",
    categorie: "RENOUVELLEMENT",
    description: "Demande de renouvellement formée par le preneur (article L145-10 du Code de commerce) et réponse du bailleur acceptant le renouvellement, avec proposition de loyer.",
    contenu: `# Renouvellement du bail commercial

## 1. Demande de renouvellement par le preneur (article L145-10 du Code de commerce)

{{locataire.nomComplet}}
{{locataire.adresse}}

À {{bailleur.nom}}, {{bailleur.adresse}}

[À COMPLÉTER : lieu], le {{date.jour}}
Par acte de commissaire de justice ou lettre recommandée avec accusé de réception

Objet : demande de renouvellement du bail commercial des locaux situés {{lot.adresse}}

Madame, Monsieur,

Je suis titulaire du bail commercial conclu le {{bail.dateSignature}}, portant sur les locaux situés {{lot.adresse}} ({{lot.designation}}), ayant pris effet le {{bail.dateDebut}} et venu à expiration le {{bail.dateFin}} [ou : se poursuivant par tacite prolongation depuis le …].

Conformément à l'article L145-10 du Code de commerce, je vous demande le renouvellement de ce bail à compter du [À COMPLÉTER : date], pour une durée de neuf années, aux clauses et conditions du bail expiré et moyennant un loyer annuel de [À COMPLÉTER : montant] hors taxes et hors charges [ou : moyennant le loyer en vigueur].

À peine de forclusion, la présente demande reproduit les termes de l'alinéa 4 de l'article L145-10 : « Dans les trois mois de la signification de la demande en renouvellement, le bailleur doit, par acte extrajudiciaire, faire connaître au demandeur s'il refuse le renouvellement en précisant les motifs de ce refus. À défaut d'avoir fait connaître ses intentions dans ce délai, le bailleur est réputé avoir accepté le principe du renouvellement du bail précédent. »

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{locataire.nomComplet}}

## 2. Réponse du bailleur — acceptation du renouvellement avec proposition de loyer

{{bailleur.nom}}
{{bailleur.adresse}}

À {{locataire.nomComplet}}, {{lot.adresse}}

[À COMPLÉTER : lieu], le [À COMPLÉTER : date, dans les trois mois de la demande]
Par acte de commissaire de justice

Objet : réponse à votre demande de renouvellement du bail commercial

Madame, Monsieur,

En réponse à votre demande du [À COMPLÉTER], j'accepte le principe du renouvellement du bail commercial portant sur les locaux situés {{lot.adresse}} à compter du [À COMPLÉTER], pour une durée de neuf années, aux clauses et conditions du bail expiré, sous réserve de la fixation du loyer.

Je vous propose un loyer annuel de [À COMPLÉTER : montant] hors taxes et hors charges, [À COMPLÉTER : correspondant à la variation de l'indice des loyers commerciaux depuis la fixation initiale (article L145-34, plafonnement) / justifié par une modification notable des éléments de la valeur locative (article L145-33) / résultant d'un bail de plus de douze ans par tacite prolongation, non soumis au plafonnement]. En cas de désaccord sur le montant du loyer, la partie la plus diligente saisira la commission départementale de conciliation puis le juge des loyers commerciaux ; le nouveau loyer sera dû à compter de la date d'effet du bail renouvelé.

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{bailleur.nom}}
{{bailleur.representant}}`,
  },
];

export const MODELES_RESILIATIONS: ModeleDefaut[] = [
  {
    code: "conge-locataire-habitation",
    nom: "Congé donné par le locataire (bail d'habitation vide ou meublé)",
    categorie: "RESILIATION",
    description: "Lettre de congé du locataire avec préavis de trois mois (vide) ou d'un mois (meublé, zone tendue et motifs de l'article 15 I), à notifier par lettre recommandée, acte de commissaire de justice ou remise contre récépissé.",
    contenu: `# Congé donné par le locataire

{{locataire.nomComplet}}
{{lot.adresse}}
{{locataire.email}} — {{locataire.telephone}}

À {{bailleur.nom}}
{{bailleur.adresse}}

[À COMPLÉTER : lieu], le {{date.jour}}
Lettre recommandée avec accusé de réception [ou remise en main propre contre récépissé ou émargement]

Objet : congé du logement situé {{lot.adresse}}

Madame, Monsieur,

Locataire du logement situé {{lot.adresse}} ({{lot.designation}}) en vertu du bail ayant pris effet le {{bail.dateDebut}}, je vous informe par la présente de ma décision de mettre fin au bail, conformément à l'article 15 de la loi n° 89-462 du 6 juillet 1989.

Le préavis applicable est de [À COMPLÉTER : trois mois (logement vide) / un mois (logement meublé, ou logement vide situé en zone tendue, ou motif prévu à l'article 15 I : mutation, perte d'emploi, nouvel emploi consécutif à une perte d'emploi, état de santé justifié, bénéficiaire du RSA ou de l'AAH, attribution d'un logement social)]. [À COMPLÉTER : justificatif joint le cas échéant.] Le préavis court à compter de la réception de la présente ; le bail prendra donc fin le [À COMPLÉTER : date], date à laquelle je restituerai les clés.

Je vous propose de convenir d'une date pour l'état des lieux de sortie et vous remercie de me restituer le dépôt de garantie de {{bail.depotGarantie}} dans le délai d'un mois suivant la remise des clés si l'état des lieux de sortie est conforme à l'état des lieux d'entrée, et de deux mois dans le cas contraire, à l'adresse suivante : [À COMPLÉTER : nouvelle adresse].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{locataire.nomComplet}}`,
  },
  {
    code: "conge-bailleur-habitation",
    nom: "Congé donné par le bailleur (bail d'habitation) — vente, reprise ou motif légitime et sérieux",
    categorie: "RESILIATION",
    description: "Congé du bailleur pour le terme du bail, notifié six mois avant (logement vide) ou trois mois avant (meublé), avec les mentions obligatoires de l'article 15 de la loi du 6 juillet 1989 selon le motif.",
    contenu: `# Congé donné par le bailleur

${ENTETE_COURRIER}
[ou acte de commissaire de justice, ou remise en main propre contre récépissé ou émargement]

Objet : congé pour le terme du bail du logement situé {{lot.adresse}}

Madame, Monsieur,

Vous occupez le logement situé {{lot.adresse}} ({{lot.designation}}) en vertu d'un bail d'habitation ayant pris effet le {{bail.dateDebut}}, dont le terme est fixé au {{bail.dateFin}}.

Conformément à l'article 15 de la loi n° 89-462 du 6 juillet 1989, je vous donne congé pour cette échéance, en respectant le préavis légal de [À COMPLÉTER : six mois (logement vide) / trois mois (logement meublé)], pour le motif suivant :

[À COMPLÉTER : conserver le motif applicable]

- Congé pour vendre : je vous informe de mon intention de vendre le logement au prix de [À COMPLÉTER : prix] et aux conditions suivantes : [À COMPLÉTER : conditions de la vente]. Le présent congé vaut offre de vente à votre profit, valable pendant les deux premiers mois du préavis. Si vous acceptez, vous disposerez d'un délai de deux mois (quatre mois si vous recourez à un prêt) pour réaliser la vente. Si le logement est ensuite vendu à des conditions ou à un prix plus avantageux, le notaire vous notifiera cette nouvelle offre, valable un mois. Sont reproduits ci-après les cinq premiers alinéas de l'article 15 II de la loi.
- Congé pour reprise : le logement est repris pour y habiter à titre de résidence principale par [À COMPLÉTER : nom, prénom et adresse du bénéficiaire], [À COMPLÉTER : moi-même / mon conjoint / mon partenaire de PACS / mon concubin notoire depuis au moins un an / mon ascendant ou descendant, ou celui de mon conjoint, partenaire ou concubin], pour le motif suivant : [À COMPLÉTER : caractère réel et sérieux de la reprise].
- Congé pour motif légitime et sérieux : [À COMPLÉTER : inexécution par le locataire de ses obligations — retards de paiement répétés, troubles de voisinage, défaut d'assurance, sous-location non autorisée — avec les faits et justificatifs].

Le bail prendra donc fin le {{bail.dateFin}} ; vous devrez avoir libéré le logement et restitué les clés à cette date, après état des lieux de sortie contradictoire. Le dépôt de garantie de {{bail.depotGarantie}} vous sera restitué dans les conditions de l'article 22 de la loi. Pendant le préavis, vous ne devez le loyer et les charges que pour la période d'occupation effective si vous quittez les lieux avant le terme.

[Rappel pour le locataire âgé de plus de 65 ans aux ressources modestes : le bailleur ne peut donner congé sans proposer un relogement, sauf s'il est lui-même âgé de plus de 65 ans ou aux ressources modestes (article 15 III).]

Est jointe à la présente la notice d'information relative aux obligations du bailleur et aux voies de recours et d'indemnisation du locataire (arrêté du 13 décembre 2017).

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{bailleur.nom}}
{{bailleur.representant}}`,
  },
  {
    code: "resiliation-amiable-anticipee",
    nom: "Résiliation anticipée d'un commun accord (tous baux)",
    categorie: "RESILIATION",
    description: "Convention de résiliation amiable et anticipée d'un bail (habitation, commercial, professionnel, garage) fixant la date de fin, la restitution des lieux, le sort du dépôt de garantie et les comptes entre les parties.",
    contenu: `# Convention de résiliation amiable et anticipée du bail

## Parties et contrat

{{bailleur.nom}}, {{bailleur.adresse}}, « le bailleur », et {{locataire.nomComplet}}, « le locataire », parties au contrat de location ({{bail.type}}) conclu le {{bail.dateSignature}} portant sur le bien situé {{lot.adresse}} ({{lot.designation}}), ayant pris effet le {{bail.dateDebut}} pour se terminer le {{bail.dateFin}}, moyennant un loyer mensuel de {{bail.loyerHC}} hors charges et {{bail.charges}} de charges.

## Article 1 – Résiliation

Les parties conviennent d'un commun accord de mettre fin au bail de manière anticipée à la date du [À COMPLÉTER : date de fin convenue], sans qu'aucun préavis ni indemnité ne soit dû de part et d'autre, chaque partie renonçant à se prévaloir de la durée restant à courir. [À COMPLÉTER : motif éventuel.]

## Article 2 – Restitution des lieux

Le locataire libérera les lieux et restituera l'intégralité des clés et moyens d'accès au plus tard le [À COMPLÉTER : date] ; un état des lieux de sortie sera établi contradictoirement à cette date. Le loyer et les charges restent dus jusqu'à la date de restitution effective.

## Article 3 – Comptes entre les parties

- Loyers et charges : [À COMPLÉTER : sommes restant dues et modalités de règlement, ou « les parties se déclarent à jour »].
- Régularisation des charges : [À COMPLÉTER : au vu du décompte de l'exercice ou forfaitaire].
- Dépôt de garantie : {{bail.depotGarantie}}, restitué dans le délai de [À COMPLÉTER : un ou deux mois] suivant la remise des clés, déduction faite des sommes justifiées restant dues.
- Indemnité éventuelle : [À COMPLÉTER : indemnité versée par l'une des parties, ou « néant »].

## Article 4 – Renonciation à recours

Sous réserve de l'exécution des engagements ci-dessus, les parties se déclarent remplies de leurs droits et renoncent à toute réclamation au titre du bail et de sa résiliation anticipée. [Bail commercial : le preneur renonce expressément au droit au renouvellement et à toute indemnité d'éviction.]

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires originaux.

Le bailleur — {{bailleur.nom}} : signature « Lu et approuvé »

Le locataire — {{locataire.nomComplet}} : signature « Lu et approuvé »`,
  },
  {
    code: "resiliation-triennale-bail-commercial",
    nom: "Congé triennal du preneur (bail commercial)",
    categorie: "RESILIATION",
    description: "Congé donné par le preneur à l'expiration d'une période triennale, avec un préavis de six mois, par lettre recommandée avec accusé de réception ou acte de commissaire de justice (article L145-4 du Code de commerce).",
    contenu: `# Congé triennal donné par le preneur

{{locataire.nomComplet}}
{{lot.adresse}}

À {{bailleur.nom}}
{{bailleur.adresse}}

[À COMPLÉTER : lieu], le {{date.jour}}
Lettre recommandée avec accusé de réception [ou acte de commissaire de justice]

Objet : congé pour l'expiration de la période triennale du bail commercial des locaux situés {{lot.adresse}}

Madame, Monsieur,

Je suis titulaire du bail commercial conclu le {{bail.dateSignature}} portant sur les locaux situés {{lot.adresse}} ({{lot.designation}}), ayant pris effet le {{bail.dateDebut}}.

En application de l'article L145-4 du Code de commerce, je vous notifie par la présente mon congé pour l'expiration de la [À COMPLÉTER : première, deuxième ou troisième] période triennale, soit le [À COMPLÉTER : date d'expiration de la période triennale], en respectant le préavis de six mois.

Je libérerai les locaux et restituerai les clés à cette date, après établissement contradictoire de l'état des lieux de sortie prévu à l'article L145-40-1. Je vous remercie de me restituer le dépôt de garantie de {{bail.depotGarantie}} après apurement des comptes, à l'adresse suivante : [À COMPLÉTER].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{locataire.nomComplet}}`,
  },
  {
    code: "resiliation-bail-mobilite-locataire",
    nom: "Résiliation du bail mobilité par le locataire",
    categorie: "RESILIATION",
    description: "Résiliation anticipée d'un bail mobilité par le locataire, à tout moment, avec un préavis d'un mois (article 25-15 de la loi du 6 juillet 1989).",
    contenu: `# Résiliation du bail mobilité par le locataire

{{locataire.nomComplet}}
{{lot.adresse}}

À {{bailleur.nom}}
{{bailleur.adresse}}

[À COMPLÉTER : lieu], le {{date.jour}}
Lettre recommandée avec accusé de réception [ou remise en main propre contre récépissé]

Objet : résiliation du bail mobilité du logement situé {{lot.adresse}}

Madame, Monsieur,

Titulaire du bail mobilité conclu pour la période du {{bail.dateDebut}} au {{bail.dateFin}} portant sur le logement meublé situé {{lot.adresse}} ({{lot.designation}}), je vous informe de ma décision d'y mettre fin de manière anticipée, comme m'y autorise l'article 25-15 de la loi n° 89-462 du 6 juillet 1989, en respectant un préavis d'un mois à compter de la réception de la présente.

Le bail prendra donc fin le [À COMPLÉTER : date], date à laquelle je restituerai les clés après l'état des lieux de sortie et l'inventaire du mobilier. Aucun dépôt de garantie n'ayant été versé, je vous remercie de me faire parvenir le décompte final éventuel à l'adresse suivante : [À COMPLÉTER].

Je vous prie d'agréer, Madame, Monsieur, l'expression de mes salutations distinguées.

{{locataire.nomComplet}}`,
  },
];

export const MODELES_CAUTIONS: ModeleDefaut[] = [
  {
    code: "acte-caution-solidaire",
    nom: "Acte de cautionnement solidaire (bail d'habitation)",
    categorie: "CAUTION",
    description: "Engagement d'une caution solidaire garantissant les obligations du locataire, conforme à l'article 22-1 de la loi du 6 juillet 1989 et aux articles 2288 et suivants du Code civil (mention à apposer par la caution).",
    contenu: `# Acte de cautionnement solidaire

## Parties

La caution : [À COMPLÉTER : civilité, nom, prénom], né(e) le [À COMPLÉTER] à [À COMPLÉTER], demeurant [À COMPLÉTER : adresse], [À COMPLÉTER : profession, lien avec le locataire], ci-après « la caution ».

Le bailleur : {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, ci-après « le bailleur ».

Le locataire cautionné : {{locataire.nomComplet}}, né(e) le {{locataire.dateNaissance}}.

## Bail garanti

Contrat de location ({{bail.type}}) portant sur le logement situé {{lot.adresse}} ({{lot.designation}}), conclu le {{bail.dateSignature}} avec prise d'effet le {{bail.dateDebut}} pour une durée de {{bail.dureeMois}} mois, moyennant un loyer mensuel de {{bail.loyerHC}} ({{bail.loyerHCLettres}}) hors charges et {{bail.charges}} de charges ({{bail.chargesRegime}}), soit {{bail.totalMensuel}} charges comprises, payable le {{bail.jourEcheance}} de chaque mois, et un dépôt de garantie de {{bail.depotGarantie}}. Le loyer est révisable chaque année à la date anniversaire du bail selon la variation de l'indice de référence des loyers (indice de référence : {{bail.irlTrimestre}}, valeur {{bail.irlValeur}}). La caution reconnaît avoir reçu un exemplaire du bail.

## Engagement de la caution

La caution déclare se porter caution solidaire du locataire envers le bailleur pour le paiement des loyers, charges, indexations, réparations locatives, indemnités d'occupation, intérêts et frais de recouvrement, et plus généralement de toutes les sommes dues en exécution du bail, de ses renouvellements et reconductions.

Durée de l'engagement : [À COMPLÉTER : conserver l'option]
- Engagement à durée déterminée : pour la durée du bail initial et de [À COMPLÉTER : un ou deux] renouvellement(s) ou reconduction(s), soit jusqu'au [À COMPLÉTER : date], sans possibilité de résiliation avant ce terme.
- Engagement à durée indéterminée : la caution peut le résilier à tout moment par lettre recommandée avec accusé de réception ; la résiliation prend effet à l'expiration du bail en cours au moment de sa notification (article 22-1, avant-dernier alinéa, de la loi du 6 juillet 1989).

Montant maximal garanti : [À COMPLÉTER : montant en chiffres] euros ([À COMPLÉTER : montant en toutes lettres]), en principal et accessoires.

Solidarité : la caution renonce expressément aux bénéfices de discussion et de division ; le bailleur pourra la poursuivre directement dès le premier impayé, sans avoir à poursuivre préalablement le locataire. En cas de pluralité de cautions, chacune est tenue solidairement pour le tout.

## Mention à apposer par la caution (article 2297 du Code civil)

La caution écrit elle-même, à la main ou par voie électronique, la mention suivante avant de signer :

« Je soussigné(e) [nom, prénom] m'engage en qualité de caution solidaire à payer au bailleur ce que lui doit le locataire {{locataire.nomComplet}} en cas de défaillance de celui-ci, dans la limite de [montant en chiffres] euros ([montant en toutes lettres]) couvrant le paiement du principal, des intérêts et, le cas échéant, des pénalités ou intérêts de retard, pour la durée de [durée de l'engagement]. En renonçant au bénéfice de discussion, je m'engage à payer le bailleur sans qu'il ait à poursuivre d'abord le locataire, et en renonçant au bénéfice de division, à rembourser seul(e) la totalité de la dette même si d'autres cautions se sont engagées. »

## Information de la caution

Le bailleur remet à la caution un exemplaire du présent acte et du bail ; il l'informe de tout impayé du locataire. Conformément à l'article 22-1 de la loi du 6 juillet 1989, l'avant-dernier alinéa de cet article est reproduit : « Lorsque le cautionnement d'obligations résultant d'un contrat de location conclu en application du présent titre ne comporte aucune indication de durée ou lorsque la durée du cautionnement est stipulée indéterminée, la caution peut le résilier unilatéralement. La résiliation prend effet au terme du contrat de location, qu'il s'agisse du contrat initial ou d'un contrat reconduit ou renouvelé, au cours duquel le bailleur reçoit notification de la résiliation. »

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en trois exemplaires (bailleur, locataire, caution).

La caution : signature précédée de la mention ci-dessus — Le bailleur : {{bailleur.nom}}`,
  },
];

export const MODELES_CONVENTIONS: ModeleDefaut[] = [
  {
    code: "convention-occupation-precaire",
    nom: "Convention d'occupation précaire",
    categorie: "CONVENTION",
    description: "Convention consentie en raison de circonstances particulières indépendantes de la volonté des parties (article L145-5-1 du Code de commerce), moyennant une redevance, sans droit au renouvellement.",
    contenu: `# Convention d'occupation précaire

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, « le propriétaire », et {{locataire.nomComplet}}, {{locataire.adresse}}, « l'occupant ».

## Article 1 – Motif de précarité

La présente convention est consentie en raison des circonstances particulières suivantes, indépendantes de la seule volonté des parties : [À COMPLÉTER : immeuble destiné à être démoli ou restructuré, vente ou expropriation en cours, attente d'une autorisation administrative, projet de travaux, succession en cours…]. Ces circonstances justifient que l'occupant ne bénéficie que d'un droit d'occupation précaire, révocable à tout moment, conformément à l'article L145-5-1 du Code de commerce et à la jurisprudence. L'occupant reconnaît qu'il ne peut se prévaloir ni du statut des baux commerciaux ni de la loi du 6 juillet 1989, ni d'aucun droit au renouvellement ou au maintien dans les lieux.

## Article 2 – Locaux et usage

Locaux situés {{lot.adresse}} — {{lot.designation}}, surface d'environ {{lot.surface}} m² : {{lot.description}}. Usage autorisé : [À COMPLÉTER : activité ou usage]. L'occupant prend les lieux dans l'état où ils se trouvent, sans pouvoir exiger de travaux.

## Article 3 – Durée

La convention prend effet le {{bail.dateDebut}} et se poursuit tant que durent les circonstances de précarité, sans pouvoir excéder le [À COMPLÉTER : date] ; elle prend fin de plein droit dès la disparition du motif de précarité. Chaque partie peut y mettre fin à tout moment moyennant un préavis de [À COMPLÉTER : nombre] jours notifié par lettre recommandée avec accusé de réception.

## Article 4 – Redevance

L'occupant verse une redevance mensuelle de {{bail.loyerHC}} ({{bail.loyerHCLettres}}), majorée de {{bail.charges}} au titre des charges, payable d'avance le {{bail.jourEcheance}} de chaque mois (IBAN {{bailleur.iban}}). Cette redevance, fixée en considération de la précarité, ne constitue pas un loyer. Dépôt de garantie : {{bail.depotGarantie}}.

## Article 5 – Obligations de l'occupant

L'occupant entretient les lieux, ne peut les transformer, les céder ni les sous-louer, souscrit les assurances nécessaires, et les restitue libres de toute occupation dès la fin de la convention, sans indemnité. À défaut de paiement ou d'exécution d'une obligation, la convention est résiliée de plein droit huit jours après mise en demeure restée infructueuse.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires.

Le propriétaire : {{bailleur.nom}} — L'occupant : {{locataire.nomComplet}} (mention « Lu et approuvé »)`,
  },
  {
    code: "contrat-location-gerance",
    nom: "Contrat de location-gérance d'un fonds de commerce",
    categorie: "CONVENTION",
    description: "Location-gérance (gérance libre) d'un fonds de commerce, articles L144-1 et suivants du Code de commerce : redevance, publicité légale, solidarité du loueur pendant six mois, restitution du fonds.",
    contenu: `# Contrat de location-gérance de fonds de commerce

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, SIREN {{bailleur.siren}}, « le loueur », propriétaire du fonds de commerce ci-après désigné, et {{locataire.nomComplet}}, [À COMPLÉTER : forme sociale, siège, SIREN, représentant], « le gérant », il est convenu ce qui suit, conformément aux articles L144-1 à L144-13 du Code de commerce.

## Article 1 – Désignation du fonds

Fonds de commerce de [À COMPLÉTER : activité] exploité {{lot.adresse}} ({{lot.designation}}), immatriculé au registre du commerce et des sociétés de [À COMPLÉTER] sous le numéro [À COMPLÉTER], comprenant : l'enseigne et le nom commercial [À COMPLÉTER], la clientèle et l'achalandage, le droit au bail des locaux [À COMPLÉTER : références du bail commercial, bailleur, échéance], le matériel, le mobilier et les agencements figurant à l'inventaire annexé, les licences et autorisations [À COMPLÉTER], le site internet et les contrats [À COMPLÉTER]. Le stock de marchandises est [À COMPLÉTER : repris par le gérant contre paiement de … / exclu].

## Article 2 – Durée

La location-gérance est consentie pour une durée de {{bail.dureeMois}} mois à compter du {{bail.dateDebut}}, jusqu'au {{bail.dateFin}}, [À COMPLÉTER : renouvelable par tacite reconduction par périodes de … / sans reconduction tacite]. Chaque partie peut s'opposer au renouvellement par lettre recommandée avec accusé de réception [À COMPLÉTER : nombre] mois avant l'échéance.

## Article 3 – Redevance

Le gérant verse une redevance mensuelle de {{bail.loyerHC}} hors taxes [À COMPLÉTER : ou fixe + variable de … % du chiffre d'affaires], majorée de la TVA, payable d'avance le {{bail.jourEcheance}} de chaque mois (IBAN {{bailleur.iban}}), indexée chaque année sur [À COMPLÉTER : indice]. Un dépôt de garantie de {{bail.depotGarantie}} est versé à la signature.

## Article 4 – Exploitation

Le gérant exploite le fonds en son nom, à ses risques et périls, en bon professionnel, sans en changer la nature ni l'enseigne, en maintenant la clientèle, en respectant le bail commercial des locaux (dont il déclare avoir pris connaissance) et la réglementation applicable. Il souscrit les assurances de l'activité et des biens loués, entretient le matériel et le remplace à l'identique en cas d'usure. Il ne peut céder le présent contrat ni sous-louer le fonds. Le loueur peut vérifier l'exploitation à tout moment.

## Article 5 – Personnel et contrats

Les contrats de travail attachés au fonds sont transférés au gérant en application de l'article L1224-1 du Code du travail ; ils lui seront rendus à la fin du contrat. Les contrats de fourniture et abonnements [À COMPLÉTER : sont transférés / résiliés].

## Article 6 – Publicité et solidarité

Le présent contrat est publié dans un support d'annonces légales dans les quinze jours de sa signature (article L144-7 du Code de commerce). Jusqu'à cette publication et pendant six mois à compter de celle-ci, le loueur est solidairement responsable avec le gérant des dettes contractées par ce dernier à l'occasion de l'exploitation du fonds. Le gérant fait mention de sa qualité de locataire-gérant sur ses documents commerciaux.

## Article 7 – Fin du contrat

À l'expiration, le gérant restitue le fonds avec ses éléments, en bon état d'entretien, un inventaire contradictoire étant établi ; les dettes du gérant deviennent immédiatement exigibles (article L144-9). Le gérant ne peut prétendre à aucune indemnité pour l'accroissement de la clientèle. Le loueur reprend le stock [À COMPLÉTER : conditions]. Clause de non-concurrence : le gérant s'interdit d'exploiter un fonds similaire dans un rayon de [À COMPLÉTER] pendant [À COMPLÉTER] à compter de la restitution.

## Article 8 – Clause résolutoire

À défaut de paiement d'une redevance ou d'exécution d'une obligation, un mois après mise en demeure restée infructueuse, le contrat est résilié de plein droit si bon semble au loueur, sans préjudice de dommages et intérêts.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en [À COMPLÉTER] exemplaires, dont un pour la publicité et l'enregistrement.

Le loueur : {{bailleur.nom}} — Le gérant : {{locataire.nomComplet}}`,
  },
  {
    code: "contrat-domiciliation-commerciale",
    nom: "Contrat de domiciliation commerciale",
    categorie: "CONVENTION",
    description: "Contrat par lequel une société domiciliataire agréée met à disposition son adresse pour le siège d'une entreprise (articles L123-11-2 et suivants et R123-167 et suivants du Code de commerce) : trois mois minimum, obligations réciproques.",
    contenu: `# Contrat de domiciliation commerciale

Entre {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.representant}}, {{bailleur.adresse}}, SIREN {{bailleur.siren}}, titulaire de l'agrément préfectoral de domiciliation n° [À COMPLÉTER] délivré le [À COMPLÉTER] (article L123-11-3 du Code de commerce), « le domiciliataire », et {{locataire.nomComplet}}, [À COMPLÉTER : forme sociale, capital, SIREN ou en cours d'immatriculation, représentant légal, adresse personnelle du représentant], « le domicilié ».

## Article 1 – Objet

Le domiciliataire met à la disposition du domicilié, pour y établir le siège de son entreprise, l'adresse suivante : {{lot.adresse}}. Le domicilié pourra y recevoir son courrier et y tenir ses réunions. Le domiciliataire déclare que les locaux permettent la réunion régulière des organes de direction et la conservation des documents et registres obligatoires, conformément à l'article R123-168 du Code de commerce.

## Article 2 – Durée

Le contrat est conclu pour une durée de [À COMPLÉTER : au moins trois mois] à compter du {{bail.dateDebut}}, renouvelable par tacite reconduction par périodes de même durée. Chaque partie peut y mettre fin à l'échéance moyennant un préavis de [À COMPLÉTER : un mois] notifié par lettre recommandée avec accusé de réception.

## Article 3 – Prestations et redevance

Prestations : domiciliation du siège, réception et [À COMPLÉTER : mise à disposition / réexpédition hebdomadaire / numérisation] du courrier, [À COMPLÉTER : mise à disposition de salle de réunion (… heures par mois), permanence téléphonique, autres]. Redevance mensuelle : {{bail.loyerHC}} hors taxes, majorée de la TVA, payable d'avance le {{bail.jourEcheance}} de chaque mois (IBAN {{bailleur.iban}}). Dépôt de garantie : {{bail.depotGarantie}}, restitué en fin de contrat. [À COMPLÉTER : frais de réexpédition refacturés.]

## Article 4 – Obligations du domicilié

Le domicilié s'engage (article R123-168) à utiliser effectivement et exclusivement les locaux comme siège de l'entreprise ou, s'il est une société, comme établissement, à informer le domiciliataire de toute modification de son activité, de sa forme juridique, de son objet, de ses dirigeants et de son adresse personnelle, à donner mandat au domiciliataire pour recevoir en son nom toute notification, et à communiquer les justificatifs d'identité et d'adresse de ses dirigeants ainsi que ses statuts.

## Article 5 – Obligations du domiciliataire

Le domiciliataire tient pour le domicilié un dossier contenant les pièces justificatives (identité, domicile et coordonnées du représentant, lieux de détention des documents comptables) et informe le greffe du tribunal de commerce de la cessation de la domiciliation ou de l'impossibilité de joindre le domicilié (article R123-168-1). Il communique chaque trimestre au centre des impôts et aux organismes de recouvrement la liste des domiciliés et met les documents à disposition des autorités habilitées.

## Article 6 – Fin du contrat

En cas de résiliation ou de non-renouvellement, le domicilié transfère son siège dans les [À COMPLÉTER : nombre] jours et procède aux formalités de modification au registre ; à défaut, le domiciliataire en informe le greffe. Le contrat est résilié de plein droit en cas de non-paiement de la redevance quinze jours après mise en demeure, ou de manquement du domicilié à ses obligations.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}, en deux exemplaires.

Le domiciliataire : {{bailleur.nom}} — Le domicilié : {{locataire.nomComplet}}`,
  },
  {
    code: "attestation-domiciliation",
    nom: "Attestation de domiciliation",
    categorie: "CONVENTION",
    description: "Attestation délivrée par le domiciliataire (ou le propriétaire des locaux) pour les formalités d'immatriculation du domicilié au registre du commerce et des sociétés.",
    contenu: `# Attestation de domiciliation

Je soussigné(e) {{bailleur.representant}}, agissant en qualité de représentant de {{bailleur.nom}}, {{bailleur.qualite}}, {{bailleur.adresse}}, SIREN {{bailleur.siren}}, [À COMPLÉTER : titulaire de l'agrément préfectoral de domiciliation n° … / propriétaire des locaux],

atteste par la présente que {{locataire.nomComplet}}, [À COMPLÉTER : forme sociale, en cours d'immatriculation ou SIREN], représentée par [À COMPLÉTER : nom et qualité du représentant légal],

est domiciliée, en vertu du contrat de domiciliation conclu le {{bail.dateSignature}} avec effet au {{bail.dateDebut}}, à l'adresse suivante, où elle établit son siège social :

{{lot.adresse}}

La présente attestation est délivrée pour servir et valoir ce que de droit, notamment pour les formalités de déclaration au registre du commerce et des sociétés et au registre national des entreprises.

Fait à [À COMPLÉTER : lieu], le {{date.jour}}.

{{bailleur.nom}}
{{bailleur.representant}}
Signature et cachet`,
  },
];
