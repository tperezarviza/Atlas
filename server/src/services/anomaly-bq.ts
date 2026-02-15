import { isBigQueryAvailable, bqQuery } from './bigquery.js';

interface BQRegionCount {
  region: string;
  event_type: string;
  count: number;
  avg_tone: number;
}

// Count events by type x region for last 24h — feeds into Welford baselines
const ANOMALY_COUNTS_QUERY = `
WITH events AS (
  SELECT
    EventRootCode,
    AvgTone,
    ActionGeo_CountryCode,
    CASE
      WHEN ActionGeo_CountryCode IN ('UP','BO','EN','LG','LO','NI','MU','SF','SY','US','UK')
        THEN 'europe'
      WHEN ActionGeo_CountryCode IN ('IS','JO','LE','SY','IZ','IR','KU','SA','YM','AE','QA','BA','MU','GA')
        THEN 'middle_east'
      WHEN ActionGeo_CountryCode IN ('CH','TW','JA','KS','KN','BM','MY','ID','AS','PK','IN','AF')
        THEN 'asia'
      WHEN ActionGeo_CountryCode IN ('US','CA','MX','GT','HO','NU','CS','PM','CU','DR','HA','JM','CO','VE','EC','PE','BR','BL','AR','CI')
        THEN 'americas'
      ELSE 'africa'
    END as region,
    CASE
      WHEN EventRootCode IN ('18','19','20') THEN 'violence'
      WHEN EventRootCode IN ('14','15') THEN 'protest'
      WHEN EventRootCode IN ('17') THEN 'coercion'
      WHEN EventRootCode IN ('10','11','12','13') THEN 'demand'
      ELSE 'other'
    END as event_type
  FROM \`gdelt-bq.gdeltv2.events\`
  WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
    AND ActionGeo_CountryCode IS NOT NULL
    AND EventRootCode IN ('10','11','12','13','14','15','17','18','19','20')
)
SELECT
  region,
  event_type,
  COUNT(*) as count,
  AVG(AvgTone) as avg_tone
FROM events
GROUP BY region, event_type
ORDER BY region, event_type
`;

/**
 * Returns event counts per region x type from BigQuery.
 * Use these to feed Welford baselines alongside local cache counts.
 */
export async function fetchBQAnomalyCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (!isBigQueryAvailable()) return counts;

  try {
    const rows = await bqQuery<BQRegionCount>(ANOMALY_COUNTS_QUERY);

    for (const row of rows) {
      // Key format matches anomaly-detector.ts: "event_type:region"
      counts.set(`bq_${row.event_type}:${row.region}`, row.count);
    }

    // Global aggregates
    const globalViolence = rows
      .filter(r => r.event_type === 'violence')
      .reduce((sum, r) => sum + r.count, 0);
    counts.set('bq_violence:global', globalViolence);

    const globalProtest = rows
      .filter(r => r.event_type === 'protest')
      .reduce((sum, r) => sum + r.count, 0);
    counts.set('bq_protest:global', globalProtest);

    console.log(`[ANOMALY-BQ] ${rows.length} region×type counts from BigQuery`);
    return counts;
  } catch (err) {
    console.warn('[ANOMALY-BQ] Query failed:', err instanceof Error ? err.message : err);
    return counts;
  }
}
