import type { TypeBail } from "@prisma/client";

const MENTIONS_COMMUNES = `- Identification des parties (bailleur, le cas échéant son représentant ; locataire) ;
- Désignation du logement : adresse, type d'habitat, surface habitable, nombre de pièces, éléments d'équipement, annexes (cave, parking, jardin) à compléter si inconnus, modalités de production de chauffage et d'eau chaude à compléter ;
- Destination : résidence principale du locataire ;
- Date de prise d'effet et durée, avec le régime légal applicable ;
- Loyer : montant, périodicité et date de paiement, modalités de paiement (virement sur le compte indiqué si un IBAN figure dans la fiche) ;
- Révision du loyer : clause de révision annuelle sur l'indice de référence des loyers (IRL) avec l'indice de référence, ou mention de l'absence de révision ;
- Charges récupérables : régime (provision avec régularisation annuelle, ou forfait) et montant ;
- Dépôt de garantie : montant et conditions de restitution (délai d'un mois si l'état des lieux de sortie est conforme, deux mois sinon), ou mention de l'absence de dépôt ;
- Clause résolutoire (défaut de paiement du loyer, des charges ou du dépôt de garantie, défaut d'assurance) ;
- Obligations du bailleur et du locataire (délivrance d'un logement décent, jouissance paisible, entretien courant et réparations locatives, usage paisible, assurance contre les risques locatifs à justifier chaque année) ;
- État des lieux d'entrée et de sortie, dossier de diagnostic technique annexé (DPE, risques, plomb, électricité et gaz le cas échéant), notice d'information annexée ;
- Autres conditions particulières éventuelles (animaux, travaux, colocation) uniquement si elles figurent dans les observations ;
- Lieu et date, mention « Fait en deux exemplaires originaux », bloc de signatures des parties avec la mention « Lu et approuvé ».`;

const SPECIFICITES: Record<TypeBail, string> = {
  NON_MEUBLE: `Régime : titre Ier de la loi du 6 juillet 1989 (logement vide). Durée minimale de 3 ans (6 ans si le bailleur est une personne morale), reconduction tacite par périodes de même durée. Préavis du locataire de 3 mois (réduit à 1 mois dans les cas prévus par la loi), congé du bailleur 6 mois avant l'échéance pour vente, reprise ou motif légitime et sérieux. Dépôt de garantie limité à un mois de loyer hors charges. Charges en provisions régularisées annuellement. Le contrat doit reprendre le contenu du contrat type du décret n° 2015-587 du 29 mai 2015.`,
  MEUBLE: `Régime : titre Ier bis de la loi du 6 juillet 1989 (logement meublé). Durée d'un an avec reconduction tacite (neuf mois sans reconduction pour un étudiant). Préavis du locataire d'un mois, congé du bailleur trois mois avant l'échéance pour vente, reprise ou motif légitime et sérieux. Dépôt de garantie limité à deux mois de loyer hors charges. Charges au forfait ou en provisions régularisées. Inventaire et état détaillé du mobilier annexés, le mobilier devant respecter la liste du décret n° 2015-981 du 31 juillet 2015. Le contrat doit reprendre le contenu du contrat type du décret n° 2015-587 du 29 mai 2015.`,
  COMMERCIAL: `Régime : statut des baux commerciaux (articles L. 145-1 et suivants du Code de commerce). Durée de 9 ans au minimum (ou bail dérogatoire de 3 ans au plus si la durée indiquée est inférieure), faculté de résiliation du preneur à l'expiration de chaque période triennale avec 6 mois de préavis, droit au renouvellement, destination des lieux (activité autorisée) et clause de déspécialisation, répartition des charges, impôts et travaux conforme aux articles L. 145-40-2 et R. 145-35 (inventaire des charges annexé, gros travaux de l'article 606 du Code civil à la charge du bailleur), révision triennale sur l'ILC ou l'ILAT, dépôt de garantie libre, clause résolutoire, état des lieux. Si le bail est soumis à la TVA, préciser que le loyer et les charges s'entendent hors taxes et sont majorés de la TVA au taux en vigueur (option du bailleur, CGI art. 260 2°) ; sinon indiquer que le loyer est stipulé hors TVA sans option. Ne pas appliquer la loi du 6 juillet 1989.`,
  PROFESSIONNEL: `Régime : bail professionnel de l'article 57 A de la loi n° 86-1290 du 23 décembre 1986 (locaux à usage exclusivement professionnel, professions libérales). Durée de 6 ans au minimum, résiliation par le preneur à tout moment avec 6 mois de préavis par lettre recommandée ou acte extrajudiciaire, congé du bailleur 6 mois avant le terme, reconduction tacite pour la même durée. Destination exclusivement professionnelle, dépôt de garantie libre, révision selon la clause du bail (ILAT), répartition des charges et réparations, clause résolutoire, état des lieux. Si le bail est soumis à la TVA, préciser que le loyer et les charges s'entendent hors taxes et sont majorés de la TVA à 20 % (option du bailleur) ; sinon indiquer que le loyer est stipulé sans TVA. Ne pas appliquer la loi du 6 juillet 1989.`,
  SAISONNIER: `Régime : location meublée de tourisme (article L. 324-1-1 du Code du tourisme, articles 1713 et suivants du Code civil), hors loi du 6 juillet 1989. Location de courte durée à une clientèle de passage n'y élisant pas domicile, 90 jours consécutifs au maximum pour un même client, prix global de la location avec charges comprises ou forfait, dépôt de garantie et conditions d'annulation, inventaire du mobilier et état des lieux, nombre d'occupants maximal, prestations fournies (linge, ménage, petit-déjeuner, accueil) le cas échéant. Si des prestations para-hôtelières sont fournies et que le bail est soumis à la TVA, préciser que le prix s'entend toutes taxes comprises avec TVA à 10 %. Mentionner le numéro d'enregistrement en mairie s'il figure dans les observations.`,
  MOBILITE: `Régime : titre Ier ter de la loi du 6 juillet 1989 (bail mobilité, articles 25-12 à 25-18), logement meublé. Durée de 1 à 10 mois, non renouvelable et non reconductible ; une seule modification de durée par avenant sans dépasser 10 mois au total. Le locataire doit justifier, à la date de prise d'effet, être en formation professionnelle, études supérieures, contrat d'apprentissage, stage, engagement volontaire de service civique, mutation professionnelle ou mission temporaire : reprendre le motif indiqué. Aucun dépôt de garantie. Charges obligatoirement au forfait. Pas de révision de loyer. Préavis du locataire d'un mois à tout moment. Le contrat doit mentionner expressément qu'il s'agit d'un bail mobilité soumis au titre Ier ter de la loi du 6 juillet 1989 et le motif du locataire ; à défaut de ces mentions, le bail est requalifié en bail meublé de droit commun.`,
};

export function promptContratBail(fiche: string, type: TypeBail, instructions: string | null): string {
  return `Rédige le contrat de location complet correspondant à la fiche ci-dessous.

${SPECIFICITES[type]}

Le contrat doit comporter, dans des articles numérotés et titrés (« ## Article 1 – Parties », etc.) :
${MENTIONS_COMMUNES}

Reprends fidèlement tous les montants, dates et identités de la fiche. Rédige les clauses en entier (pas de renvoi du type « voir loi »), en langage clair.${instructions ? `\n\nInstructions complémentaires de l'utilisateur : ${instructions}` : ""}

# FICHE DU BAIL
${fiche}`;
}

export function promptCourrierRevision(fiche: string, revision: { dateEffet: string; ancienLoyer: string; nouveauLoyer: string; irlAncien: string; irlNouveau: string; variation: string }, instructions: string | null): string {
  return `Rédige la lettre par laquelle le bailleur notifie au locataire la révision annuelle de son loyer, prête à être imprimée ou envoyée par email.

Structure attendue : en-tête avec les coordonnées du bailleur puis du locataire, lieu et date (utilise [À COMPLÉTER : lieu] et [À COMPLÉTER : date] si absents), objet « Révision annuelle du loyer », formule d'appel, rappel de la clause de révision et de l'article 17-1 de la loi du 6 juillet 1989, calcul détaillé (loyer actuel × nouvel indice / ancien indice), nouveau montant du loyer hors charges et total mensuel charges comprises, date d'effet, formule de politesse et signature.

Données de la révision :
- Date d'effet : ${revision.dateEffet}
- Ancien loyer hors charges : ${revision.ancienLoyer}
- Nouveau loyer hors charges : ${revision.nouveauLoyer}
- Indice de référence (ancien) : ${revision.irlAncien}
- Nouvel indice : ${revision.irlNouveau}
- Variation de l'indice : ${revision.variation} %${instructions ? `\n\nInstructions complémentaires de l'utilisateur : ${instructions}` : ""}

# FICHE DU BAIL
${fiche}`;
}

export function promptRelance(fiche: string, impayes: string, niveau: "simple" | "mise_en_demeure", instructions: string | null): string {
  const consigne =
    niveau === "simple"
      ? "Rédige une lettre de relance amiable, ferme mais courtoise, pour loyer impayé : rappel des sommes dues (détail par échéance et total), invitation à régulariser sous 8 jours, proposition de contact en cas de difficulté, rappel que la clause résolutoire du bail pourra être mise en œuvre à défaut."
      : "Rédige une mise en demeure de payer pour loyer impayé, envoyée en lettre recommandée avec accusé de réception : détail des sommes dues par échéance et total, délai de régularisation de 8 jours, rappel de la clause résolutoire et de la possibilité de faire délivrer un commandement de payer par commissaire de justice, mention de la possibilité de saisir le fonds de solidarité pour le logement et la commission de surendettement.";
  return `${consigne}

Structure : en-tête (bailleur puis locataire), lieu et date à compléter si absents, objet, corps, formule de politesse, signature.

Échéances impayées :
${impayes}${instructions ? `\n\nInstructions complémentaires de l'utilisateur : ${instructions}` : ""}

# FICHE DU BAIL
${fiche}`;
}

export function promptCourrierLibre(fiche: string, instructions: string): string {
  return `Rédige le courrier suivant, adressé par le bailleur au locataire, avec en-tête (bailleur puis locataire), lieu et date à compléter si absents, objet, corps, formule de politesse et signature.

Demande de l'utilisateur : ${instructions}

# FICHE DU BAIL
${fiche}`;
}

export function promptEmail(fiche: string, objet: string, contexte: string, instructions: string | null): string {
  return `Rédige le texte d'un email court (10 lignes maximum) adressé par le bailleur au locataire, sans en-tête postal : une formule d'appel, le message, une formule de politesse et la signature du bailleur. Réponds sur ce format exact :
Objet : <objet>
<ligne vide>
<corps du message>

Objet proposé : ${objet}
Contexte : ${contexte}${instructions ? `\nInstructions complémentaires : ${instructions}` : ""}

# FICHE DU BAIL
${fiche}`;
}
