import { BigQuery } from "@google-cloud/bigquery";
const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

const [jobs] = await bq.getJobs({ maxResults: 50, allUsers: true });

let totalBytes = 0;
console.log("=== LAST 50 BQ JOBS ===");
console.log("State | Start Time | GB Scanned | Query");
console.log("-".repeat(120));

for (const j of jobs) {
  const m = j.metadata;
  const bytes = Number(m.statistics?.totalBytesProcessed || 0);
  totalBytes += bytes;
  const gb = (bytes / 1e9).toFixed(1);
  const state = m.status?.state || "?";
  const start = m.statistics?.startTime
    ? new Date(Number(m.statistics.startTime)).toISOString().slice(0, 19)
    : "?";
  const query = (m.configuration?.query?.query || "").replace(/\n/g, " ").slice(0, 90);
  console.log(`${state.padEnd(7)} | ${start} | ${gb.padStart(8)} GB | ${query}`);
}

console.log("-".repeat(120));
console.log(`TOTAL: ${(totalBytes / 1e12).toFixed(3)} TB ($${(totalBytes / 1e12 * 6.25).toFixed(2)})`);
console.log(`Jobs counted: ${jobs.length}`);
