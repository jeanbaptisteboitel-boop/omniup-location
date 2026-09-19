// Vérifie des idbanks auprès du service SDMX de l'INSEE (accès libre) : libellé officiel et dernière valeur.
// Usage : node scripts/verifier-idbanks.mjs            → lot par défaut (IRL, ILC, ILAT, ICC, BT01)
//         node scripts/verifier-idbanks.mjs 001759970 … → idbanks à contrôler
// Variables : INSEE_URL (base du service, https://bdm.insee.fr par défaut), HTTPS_PROXY si nécessaire.
import { XMLParser } from "fast-xml-parser";

const DEFAUT = { IRL: "001515333", ILC: "001532540", ILAT: "001617112", ICC: "000008630", BT01: "001710986" };
const base = (process.env.INSEE_URL || "https://bdm.insee.fr").replace(/\/+$/, "");
const args = process.argv.slice(2);
const cibles = args.length ? args.map((a) => [a, a]) : Object.entries(DEFAUT);
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", removeNSPrefix: true, parseTagValue: false, parseAttributeValue: false, isArray: (n) => n === "Series" || n === "Obs" });
let echec = false;
for (const [code, idbank] of cibles) {
  const url = `${base}/series/sdmx/data/SERIES_BDM/${idbank}?lastNObservations=1`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/xml", "User-Agent": "OMNIUP-Location (vérification d'idbank)" }, signal: AbortSignal.timeout(30000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const doc = parser.parse(await r.text());
    const serie = [].concat(doc.StructureSpecificData?.DataSet?.Series ?? [])[0];
    if (!serie) throw new Error("série absente de la réponse");
    const obs = [].concat(serie.Obs ?? [])[0];
    console.log([code, idbank, serie.TITLE_FR ?? "(sans libellé)", `FREQ=${serie.FREQ ?? "?"}`, obs ? `${obs.TIME_PERIOD} = ${obs.OBS_VALUE} (${obs.OBS_STATUS ?? "?"})` : "AUCUNE OBSERVATION", `LAST_UPDATE=${serie.LAST_UPDATE ?? "?"}`].join("\t"));
    if (!obs) echec = true;
  } catch (e) {
    echec = true;
    console.log(`${code}\t${idbank}\tÉCHEC : ${e.message}`);
  }
}
process.exit(echec ? 1 : 0);
