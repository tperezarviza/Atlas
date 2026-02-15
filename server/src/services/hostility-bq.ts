import { bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { HostilityPair, Severity } from '../types.js';

interface BQHostilityRow {
  countryA: string;
  codeA: string;
  countryB: string;
  codeB: string;
  avg_tone: number;
  article_count: number;
  top_urls: string[];
}

const HOSTILITY_QUERY = `
WITH pairs AS (
  SELECT 'United States' as nameA, 'USA' as codeA, 'China' as nameB, 'CHN' as codeB UNION ALL
  SELECT 'United States', 'USA', 'Russia', 'RUS' UNION ALL
  SELECT 'United States', 'USA', 'Iran', 'IRN' UNION ALL
  SELECT 'United States', 'USA', 'North Korea', 'PRK' UNION ALL
  SELECT 'Israel', 'ISR', 'Iran', 'IRN' UNION ALL
  SELECT 'India', 'IND', 'Pakistan', 'PAK' UNION ALL
  SELECT 'India', 'IND', 'China', 'CHN' UNION ALL
  SELECT 'China', 'CHN', 'Taiwan', 'TWN' UNION ALL
  SELECT 'Saudi Arabia', 'SAU', 'Iran', 'IRN' UNION ALL
  SELECT 'Russia', 'RUS', 'Ukraine', 'UKR' UNION ALL
  SELECT 'Turkey', 'TUR', 'Greece', 'GRC' UNION ALL
  SELECT 'Japan', 'JPN', 'China', 'CHN' UNION ALL
  SELECT 'South Korea', 'KOR', 'North Korea', 'PRK' UNION ALL
  SELECT 'Armenia', 'ARM', 'Azerbaijan', 'AZE' UNION ALL
  SELECT 'Serbia', 'SRB', 'Kosovo', 'XKX'
),
events AS (
  SELECT
    Actor1CountryCode, Actor2CountryCode,
    AvgTone, SOURCEURL
  FROM \`gdelt-bq.gdeltv2.events\`
  WHERE SQLDATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)) AS INT64)
    AND AvgTone IS NOT NULL
    AND Actor1CountryCode IS NOT NULL
    AND Actor2CountryCode IS NOT NULL
)
SELECT
  p.nameA as countryA,
  p.codeA,
  p.nameB as countryB,
  p.codeB,
  AVG(e.AvgTone) as avg_tone,
  COUNT(*) as article_count,
  ARRAY_AGG(e.SOURCEURL ORDER BY ABS(e.AvgTone) DESC LIMIT 5) as top_urls
FROM pairs p
JOIN events e
  ON (e.Actor1CountryCode = p.codeA AND e.Actor2CountryCode = p.codeB)
  OR (e.Actor1CountryCode = p.codeB AND e.Actor2CountryCode = p.codeA)
GROUP BY p.nameA, p.codeA, p.nameB, p.codeB
HAVING COUNT(*) >= 5
ORDER BY avg_tone ASC
`;

// Map GDELT 3-letter FIPS codes back to 2-letter ISO for frontend
const FIPS_TO_ISO: Record<string, string> = {
  USA: 'US', CHN: 'CN', RUS: 'RU', IRN: 'IR', PRK: 'KP', ISR: 'IL',
  IND: 'IN', PAK: 'PK', TWN: 'TW', SAU: 'SA', UKR: 'UA', TUR: 'TR',
  GRC: 'GR', JPN: 'JP', KOR: 'KR', ARM: 'AM', AZE: 'AZ', SRB: 'RS', XKX: 'XK',
};

function classifyTone(tone: number): Severity {
  if (tone < -5) return 'critical';
  if (tone < -3) return 'high';
  if (tone < -1) return 'medium';
  return 'low';
}

export async function fetchHostilityBQ(): Promise<void> {
  console.log('[HOSTILITY-BQ] Computing hostility index via BigQuery...');

  try {
    const rows = await bqQuery<BQHostilityRow>(HOSTILITY_QUERY);
    console.log(`[HOSTILITY-BQ] Got ${rows.length} pairs from BigQuery`);

    const pairs: HostilityPair[] = rows.map(row => ({
      id: `hp-${(FIPS_TO_ISO[row.codeA] || row.codeA).toLowerCase()}-${(FIPS_TO_ISO[row.codeB] || row.codeB).toLowerCase()}`,
      countryA: row.countryA,
      codeA: FIPS_TO_ISO[row.codeA] || row.codeA,
      countryB: row.countryB,
      codeB: FIPS_TO_ISO[row.codeB] || row.codeB,
      avgTone: Math.round(row.avg_tone * 100) / 100,
      articleCount: row.article_count,
      trend: classifyTone(row.avg_tone),
      topHeadlines: [],
    }));

    if (pairs.length > 0) {
      cache.set('hostility', pairs, TTL.HOSTILITY);
      console.log(`[HOSTILITY-BQ] ${pairs.length} hostility pairs cached`);
    }
  } catch (err) {
    console.error('[HOSTILITY-BQ] Failed:', err instanceof Error ? err.message : err);
  }
}
