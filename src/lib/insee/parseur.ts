import { XMLParser, XMLValidator } from "fast-xml-parser";

/**
 * Analyse des réponses SDMX-ML « structure specific » du service de données de la BDM :
 * chaque <Series> porte IDBANK, TITLE_FR, FREQ, UNIT_MEASURE, BASE_PER, LAST_UPDATE ;
 * chaque <Obs> porte TIME_PERIOD, OBS_VALUE (conservée en chaîne) et OBS_STATUS (A définitif, P provisoire…).
 */

export type ObservationSDMX = { periode: string; valeur: string; statut: string | null };
export type SerieSDMX = {
  idbank: string;
  titre: string | null;
  frequence: string | null;
  unite: string | null;
  base: string | null;
  miseAJour: string | null;
  observations: ObservationSDMX[];
};

type Noeud = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (nom) => nom === "Series" || nom === "Obs" || nom === "DataSet",
});

const VALEUR_NUMERIQUE = /^-?\d+(\.\d+)?$/;

function texte(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function tableau(v: unknown): Noeud[] {
  if (Array.isArray(v)) return v.filter((x): x is Noeud => !!x && typeof x === "object");
  return v && typeof v === "object" ? [v as Noeud] : [];
}

/** Séries et observations d'une réponse ; une série sans observation est renvoyée avec une liste vide. */
export function parseSdmx(xml: string): SerieSDMX[] {
  if (!xml || xml.trim() === "") return [];
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error(`Réponse de l'INSEE illisible : ${validation.err.msg}.`);
  let doc: Noeud;
  try {
    doc = parser.parse(xml) as Noeud;
  } catch (e) {
    throw new Error(`Réponse de l'INSEE illisible : ${e instanceof Error ? e.message : "XML invalide"}.`);
  }
  const racine = (doc.StructureSpecificData ?? doc.GenericData ?? doc) as Noeud;
  const series: SerieSDMX[] = [];
  for (const ds of tableau(racine.DataSet)) {
    for (const s of tableau(ds.Series)) {
      const idbank = texte(s.IDBANK);
      if (!idbank) continue;
      const observations: ObservationSDMX[] = [];
      for (const o of tableau(s.Obs)) {
        const periode = texte(o.TIME_PERIOD);
        const valeur = texte(o.OBS_VALUE);
        if (!periode || valeur === null || !VALEUR_NUMERIQUE.test(valeur)) continue;
        observations.push({ periode, valeur, statut: texte(o.OBS_STATUS) });
      }
      series.push({ idbank, titre: texte(s.TITLE_FR), frequence: texte(s.FREQ), unite: texte(s.UNIT_MEASURE), base: texte(s.BASE_PER), miseAJour: texte(s.LAST_UPDATE), observations });
    }
  }
  return series;
}
