import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';

interface BQCountryTone {
  country_code: string;
  avg_tone: number;
  article_count: number;
  negative_pct: number;
  violence_count: number;
}

// Per-country instability signals from GDELT events
const COUNTRY_TONE_QUERY = `
SELECT
  Actor1CountryCode as country_code,
  AVG(AvgTone) as avg_tone,
  COUNT(*) as article_count,
  COUNTIF(AvgTone < -2) / COUNT(*) * 100 as negative_pct,
  COUNTIF(EventRootCode IN ('18','19','20')) as violence_count
FROM \`gdelt-bq.gdeltv2.events\`
WHERE SQLDATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)) AS INT64)
  AND Actor1CountryCode IN (
    'US','CH','RS','IR','UP','IS','SY','TU','IN','PK','AF',
    'IZ','YM','LE','SO','LY','VE','CU','KN','MY','SF','NI',
    'TW','JA','KS','SA','AE','EG','ET','SU','CO','HA','ML',
    'MX','BL','CD','NG','MZ','BM','BC','CE','TH','RP'
  )
  AND AvgTone IS NOT NULL
GROUP BY country_code
HAVING COUNT(*) >= 3
ORDER BY avg_tone ASC
`;

// GDELT uses FIPS country codes, map to ISO2
const FIPS_TO_ISO2: Record<string, string> = {
  US:'US', CH:'CN', RS:'RU', IR:'IR', UP:'UA', IS:'IL', SY:'SY', TU:'TR',
  IN:'IN', PK:'PK', AF:'AF', IZ:'IQ', YM:'YE', LE:'LB', SO:'SO', LY:'LY',
  VE:'VE', CU:'CU', KN:'KP', MY:'MM', SF:'ZA', NI:'NG', TW:'TW', JA:'JP',
  KS:'KR', SA:'SA', AE:'AE', EG:'EG', ET:'ET', SU:'SD', CO:'CO', HA:'HT',
  ML:'ML', MX:'MX', BL:'BO', CD:'DM', MZ:'MZ', BM:'BM', BC:'BW', CE:'LK',
  TH:'TH', RP:'PH',
};

export interface CountryToneBQ {
  isoCode: string;
  avgTone: number;
  articleCount: number;
  negativePct: number;
  violenceCount: number;
}

/**
 * Returns per-country tone data from BigQuery.
 * CII can use this instead of geo-proximity matching.
 */
export async function fetchCountryToneBQ(): Promise<CountryToneBQ[]> {
  if (!isBigQueryAvailable()) return [];

  try {
    const rows = await bqQuery<BQCountryTone>(COUNTRY_TONE_QUERY);

    const result = rows
      .filter(r => FIPS_TO_ISO2[r.country_code])
      .map(r => ({
        isoCode: FIPS_TO_ISO2[r.country_code],
        avgTone: Math.round(r.avg_tone * 100) / 100,
        articleCount: r.article_count,
        negativePct: Math.round(r.negative_pct * 10) / 10,
        violenceCount: r.violence_count,
      }));

    // Cache for CII to consume
    await cache.setWithRedis('country_tone_bq', result, 60 * 60 * 1000, 12 * 3600); // 1h mem, 12h Redis
    console.log(`[CII-BQ] ${result.length} country tones computed via BigQuery`);
    return result;
  } catch (err) {
    console.warn('[CII-BQ] Query failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
