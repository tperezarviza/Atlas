import { BigQuery } from "@google-cloud/bigquery";
const bq = new BigQuery({ projectId: process.env.GCP_PROJECT_ID });

// Get ALL jobs (paginate)
let allJobs = [];
let pageToken;
do {
  const [jobs, , resp] = await bq.getJobs({ maxResults: 200, allUsers: true, pageToken });
  allJobs.push(...jobs);
  pageToken = resp?.nextPageToken;
} while (pageToken && allJobs.length < 2000);

let totalBytes = 0;
const byHour = {};
const bySize = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };
const bySizeBytes = { tiny: 0, small: 0, medium: 0, large: 0, huge: 0 };

for (const j of allJobs) {
  const m = j.metadata;
  const bytes = Number(m.statistics?.totalBytesProcessed || 0);
  totalBytes += bytes;
  const gb = bytes / 1e9;

  const start = m.statistics?.startTime
    ? new Date(Number(m.statistics.startTime)).toISOString().slice(0, 13)
    : "unknown";
  byHour[start] = (byHour[start] || 0) + bytes;

  if (gb > 1000) { bySize.huge++; bySizeBytes.huge += bytes; }
  else if (gb > 50) { bySize.large++; bySizeBytes.large += bytes; }
  else if (gb > 15) { bySize.medium++; bySizeBytes.medium += bytes; }
  else if (gb > 1) { bySize.small++; bySizeBytes.small += bytes; }
  else { bySize.tiny++; bySizeBytes.tiny += bytes; }
}

console.log(`Total jobs: ${allJobs.length}`);
console.log(`Total bytes: ${(totalBytes / 1e12).toFixed(3)} TB ($${(totalBytes / 1e12 * 6.25).toFixed(2)})`);

console.log("\n=== BY SIZE CATEGORY ===");
for (const [cat, count] of Object.entries(bySize)) {
  const tb = (bySizeBytes[cat] / 1e12).toFixed(3);
  console.log(`  ${cat.padEnd(8)}: ${String(count).padStart(4)} jobs, ${tb} TB ($${(bySizeBytes[cat] / 1e12 * 6.25).toFixed(2)})`);
}

console.log("\n=== BY HOUR ===");
const hours = Object.entries(byHour).sort();
for (const [hour, bytes] of hours) {
  const tb = (bytes / 1e12).toFixed(3);
  const gb = (bytes / 1e9).toFixed(1);
  console.log(`  ${hour}: ${gb.padStart(8)} GB ($${(bytes / 1e12 * 6.25).toFixed(2)})`);
}

// Show the HUGE jobs specifically
console.log("\n=== HUGE JOBS (>1TB) ===");
for (const j of allJobs) {
  const m = j.metadata;
  const bytes = Number(m.statistics?.totalBytesProcessed || 0);
  if (bytes > 1e12) {
    const start = m.statistics?.startTime
      ? new Date(Number(m.statistics.startTime)).toISOString().slice(0, 19)
      : "?";
    const query = (m.configuration?.query?.query || "no query text").replace(/\n/g, " ").slice(0, 120);
    console.log(`  ${start}: ${(bytes/1e12).toFixed(2)} TB - ${query}`);
  }
}
