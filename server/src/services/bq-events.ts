import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { shouldRunBQ, markBQRun, canSpendBQ, trackQueryBytes } from './bq-cost-tracker.js';

const SIX_HOURS = 6 * 60 * 60 * 1000;
const MAX_BYTES = 10_000_000_000; // 10GB hard limit per query

export interface EventSpike {
  country: string;
  yesterday: number;
  daily_avg: number;
  spike_ratio: number;
}

export interface MilitaryCameoEvent {
  country: string;
  event_code: string;
  count: number;
  avg_tone: number;
}

const SPIKE_QUERY = `
WITH daily AS (
  SELECT ActionGeo_CountryCode as country,
    COUNTIF(CAST(SQLDATE AS STRING) = FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))) as yesterday,
    COUNT(*) / 7.0 as daily_avg
  FROM \`bigquery-public-data.gdeltv2.events_partitioned\`
  WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND GoldsteinScale < -5
    AND ActionGeo_CountryCode IS NOT NULL
    AND ActionGeo_CountryCode != ''
  GROUP BY country
  HAVING yesterday > 0
)
SELECT country, yesterday, ROUND(daily_avg, 1) as daily_avg,
  ROUND(SAFE_DIVIDE(yesterday, daily_avg), 2) as spike_ratio
FROM daily WHERE yesterday > daily_avg * 2
ORDER BY spike_ratio DESC LIMIT 20
`;

const MILITARY_CAMEO_QUERY = `
SELECT ActionGeo_CountryCode as country,
  EventRootCode as event_code,
  COUNT(*) as count,
  ROUND(AVG(AvgTone), 2) as avg_tone
FROM \`bigquery-public-data.gdeltv2.events_partitioned\`
WHERE DATE(_PARTITIONTIME) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
  AND EventRootCode IN ('14','15','17','18','19','20')
  AND ActionGeo_CountryCode IS NOT NULL
GROUP BY country, event_code
HAVING count >= 5
ORDER BY count DESC
LIMIT 50
`;

export async function fetchEventSpikes(): Promise<void> {
  if (!isBigQueryAvailable()) return;
  if (!(await shouldRunBQ('event_spikes', SIX_HOURS))) return;
  if (!(await canSpendBQ(5_000_000_000))) return;

  console.log('[BQ-EVENTS] Fetching event spikes...');
  try {
    const rows = await bqQuery<EventSpike>(SPIKE_QUERY, undefined, MAX_BYTES);
    trackQueryBytes(5_000_000_000);
    await markBQRun('event_spikes');
    await cache.setWithRedis('bq_event_spikes', rows, SIX_HOURS + 3600_000, 8 * 3600);
    console.log(`[BQ-EVENTS] ${rows.length} country spikes detected`);
  } catch (err) {
    console.error('[BQ-EVENTS] Spike query failed:', err instanceof Error ? err.message : err);
  }
}

export async function fetchMilitaryCameo(): Promise<void> {
  if (!isBigQueryAvailable()) return;
  if (!(await shouldRunBQ('military_cameo', SIX_HOURS))) return;
  if (!(await canSpendBQ(4_000_000_000))) return;

  console.log('[BQ-EVENTS] Fetching military CAMEO events...');
  try {
    const rows = await bqQuery<MilitaryCameoEvent>(MILITARY_CAMEO_QUERY, undefined, MAX_BYTES);
    trackQueryBytes(4_000_000_000);
    await markBQRun('military_cameo');
    await cache.setWithRedis('bq_military_cameo', rows, SIX_HOURS + 3600_000, 8 * 3600);
    console.log(`[BQ-EVENTS] ${rows.length} military event groups cached`);
  } catch (err) {
    console.error('[BQ-EVENTS] CAMEO query failed:', err instanceof Error ? err.message : err);
  }
}
