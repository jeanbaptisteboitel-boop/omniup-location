// Autorise l'envoi direct de fichiers depuis le navigateur vers le bucket Scaleway (règle CORS).
// Usage : APP_URL=https://mon-app.vercel.app node scripts/configurer-cors.mjs
// (lit SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET, SCW_REGION, SCW_ENDPOINT depuis l'environnement ou le fichier .env)
import { readFileSync, existsSync } from "node:fs";
import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

if (existsSync(".env")) {
  for (const ligne of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(ligne);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

const { SCW_ACCESS_KEY, SCW_SECRET_KEY, SCW_BUCKET } = process.env;
const region = process.env.SCW_REGION || "fr-par";
const endpoint = process.env.SCW_ENDPOINT || `https://s3.${region}.scw.cloud`;
const origines = (process.env.APP_URL || "http://localhost:3000").split(",").map((o) => o.trim()).filter(Boolean);
if (!SCW_ACCESS_KEY || !SCW_SECRET_KEY || !SCW_BUCKET) {
  console.error("✘ Renseignez SCW_ACCESS_KEY, SCW_SECRET_KEY et SCW_BUCKET.");
  process.exit(1);
}

const client = new S3Client({ region, endpoint, credentials: { accessKeyId: SCW_ACCESS_KEY, secretAccessKey: SCW_SECRET_KEY }, forcePathStyle: true });
await client.send(
  new PutBucketCorsCommand({
    Bucket: SCW_BUCKET,
    CORSConfiguration: {
      CORSRules: [{ AllowedOrigins: origines, AllowedMethods: ["PUT", "GET", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }],
    },
  }),
);
console.log(`✔ Règle CORS appliquée au bucket ${SCW_BUCKET} pour : ${origines.join(", ")}`);
