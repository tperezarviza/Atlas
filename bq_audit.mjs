import { BigQuery } from "@google-cloud/bigquery";
const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

async function dryRun(name, sql) {
  try {
    const [job] = await bq.createQueryJob({ query: sql, location: "US", dryRun: true });
    const bytes = Number(job.metadata?.statistics?.totalBytesProcessed ?? 0);
    console.log(`${name}: ${(bytes/1e9).toFixed(2)} GB per query`);
    return bytes;
  } catch (e) {
    console.log(`${name}: ERROR - ${e.message?.slice(0,100)}`);
    return 0;
  }
}

const r = {};

r.hostility = await dryRun("Hostility (events 7d)",
  `SELECT Actor1CountryCode,Actor2CountryCode,AvgTone,SOURCEURL FROM \`gdelt-bq.gdeltv2.events\` WHERE SQLDATE>=CAST(FORMAT_TIMESTAMP('%Y%m%d',TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 7 DAY)) AS INT64) AND AvgTone IS NOT NULL AND Actor1CountryCode IS NOT NULL`);

r.cii = await dryRun("CII-Tone (events 2d)",
  `SELECT Actor1CountryCode,AvgTone,EventRootCode FROM \`gdelt-bq.gdeltv2.events\` WHERE SQLDATE>=CAST(FORMAT_TIMESTAMP('%Y%m%d',TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 2 DAY)) AS INT64) AND Actor1CountryCode IS NOT NULL AND AvgTone IS NOT NULL`);

r.anomaly = await dryRun("Anomaly (events 2d)",
  `SELECT EventRootCode,AvgTone,ActionGeo_CountryCode FROM \`gdelt-bq.gdeltv2.events\` WHERE SQLDATE>=CAST(FORMAT_TIMESTAMP('%Y%m%d',TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 2 DAY)) AS INT64) AND ActionGeo_CountryCode IS NOT NULL`);

r.geoconv = await dryRun("GeoConv (events 2d)",
  `SELECT ActionGeo_Lat,ActionGeo_Long,EventRootCode,AvgTone FROM \`gdelt-bq.gdeltv2.events\` WHERE SQLDATE>=CAST(FORMAT_TIMESTAMP('%Y%m%d',TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 2 DAY)) AS INT64) AND ActionGeo_Lat IS NOT NULL`);

r.focal = await dryRun("FocalPts (gkg 6h)",
  `SELECT V2Persons,V2Organizations,V2Locations,V2Tone,DocumentIdentifier FROM \`gdelt-bq.gdeltv2.gkg\` WHERE DATE>=CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S',TIMESTAMP_SUB(CURRENT_TIMESTAMP(),INTERVAL 6 HOUR)) AS INT64) AND V2Persons!=''`);

r.propaganda = await dryRun("Propaganda (gkg_part 2d)",
  "SELECT DocumentIdentifier,V2Tone FROM `gdelt-bq.gdeltv2.gkg_partitioned` WHERE DATE(_PARTITIONTIME)>=DATE_SUB(CURRENT_DATE(),INTERVAL 2 DAY) AND REGEXP_CONTAINS(DocumentIdentifier,r'rt\\.com|tass\\.com') LIMIT 30");

r.trends = await dryRun("Trends (public 3d)",
  `SELECT term,country_name,score FROM \`bigquery-public-data.google_trends.international_top_rising_terms\` WHERE refresh_date>=DATE_SUB(CURRENT_DATE(),INTERVAL 3 DAY) AND country_code IN('US','GB','RU') LIMIT 500`);

console.log("\n=== DAILY COST ESTIMATE ===");
const daily = [
  ["Hostility     ", r.hostility, 6],
  ["CII-Tone      ", r.cii, 48],
  ["Anomaly       ", r.anomaly, 96],
  ["GeoConv       ", r.geoconv, 48],
  ["FocalPts(GKG) ", r.focal, 4],
  ["Propaganda    ", r.propaganda, 1],
  ["Trends        ", r.trends, 8],
];
let total = 0;
for (const [n,b,f] of daily) {
  const d = b * f;
  total += d;
  console.log(`  ${n} ${(b/1e9).toFixed(1).padStart(6)}GB x ${String(f).padStart(2)}/day = ${(d/1e12).toFixed(3).padStart(6)} TB/day  ($${(d/1e12*6.25).toFixed(2)})`);
}
console.log(`\n  DAILY TOTAL:  ${(total/1e12).toFixed(2)} TB  ($${(total/1e12*6.25).toFixed(2)})`);
console.log(`  MONTHLY (30d): ${(total*30/1e12).toFixed(1)} TB  ($${(total*30/1e12*6.25).toFixed(1)})`);
