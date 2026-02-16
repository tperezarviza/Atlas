import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { redisSet } from '../redis.js';

// Countries to monitor (ISO-2)
const MONITORED_COUNTRIES = [
  'US', 'GB', 'DE', 'FR', 'RU', 'UA', 'IL', 'IR', 'TR', 'CN',
  'IN', 'PK', 'SA', 'JP', 'KR', 'EG', 'IQ', 'AR', 'BR', 'MX',
  'AU', 'PL', 'IT', 'ES', 'TW', 'NG', 'ZA',
];

// Geopolitical keywords to flag
const GEO_KEYWORDS = [
  // Conflict
  'war', 'nuclear', 'missile', 'attack', 'airstrike', 'drone', 'bomb',
  'invasion', 'ceasefire', 'military', 'sanctions', 'embargo', 'coup',
  'martial law', 'conscription', 'draft', 'mobilization',
  // Entities
  'nato', 'isis', 'hamas', 'hezbollah', 'houthi', 'taliban', 'wagner',
  // Leaders
  'trump', 'putin', 'xi jinping', 'netanyahu', 'zelensky', 'khamenei',
  // Countries/regions in crisis
  'iran', 'gaza', 'ukraine', 'taiwan', 'north korea', 'syria', 'yemen',
  'sudan', 'haiti', 'myanmar',
  // Economic crisis
  'tariff', 'recession', 'inflation', 'oil price', 'gold price', 'dollar',
  // Disaster
  'earthquake', 'tsunami', 'hurricane', 'volcano', 'evacuation', 'refugee',
  // Panic indicators
  'ww3', 'world war', 'bunker', 'iodine tablets', 'emergency kit',
];

const COUNTRY_LIST_SQL = MONITORED_COUNTRIES.map(c => `'${c}'`).join(',');

const RISING_QUERY = `
WITH latest AS (
  SELECT country_code, MAX(refresh_date) as max_date
  FROM \`bigquery-public-data.google_trends.international_top_rising_terms\`
  WHERE refresh_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND country_code IN (${COUNTRY_LIST_SQL})
  GROUP BY country_code
)
SELECT t.term, t.country_name, t.country_code, t.rank, t.score, t.refresh_date
FROM \`bigquery-public-data.google_trends.international_top_rising_terms\` t
JOIN latest l ON t.country_code = l.country_code AND t.refresh_date = l.max_date
ORDER BY t.score DESC
LIMIT 500
`;

const TOP_QUERY = `
WITH latest AS (
  SELECT country_code, MAX(refresh_date) as max_date
  FROM \`bigquery-public-data.google_trends.international_top_terms\`
  WHERE refresh_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    AND country_code IN (${COUNTRY_LIST_SQL})
  GROUP BY country_code
)
SELECT t.term, t.country_name, t.country_code, t.rank, t.score, t.refresh_date
FROM \`bigquery-public-data.google_trends.international_top_terms\` t
JOIN latest l ON t.country_code = l.country_code AND t.refresh_date = l.max_date
ORDER BY t.rank ASC
LIMIT 500
`;

export interface TrendSignal {
  term: string;
  countries: { code: string; name: string; score: number; rank: number }[];
  countryCount: number;
  maxScore: number;
  isRising: boolean;
  isGeopolitical: boolean;
  signal: 'critical' | 'strong' | 'moderate' | 'weak';
}

export interface GoogleTrendsData {
  geoTerms: TrendSignal[];
  multiCountrySignals: TrendSignal[];
  topRisingByCountry: Record<string, { term: string; score: number }[]>;
  updatedAt: string;
  refreshDate: string;
}

interface TrendRow {
  term: string;
  country_name: string;
  country_code: string;
  rank: number;
  score: number;
  refresh_date: { value: string } | string;
}

// Pre-compiled regex patterns for word-boundary matching
const GEO_PATTERNS = GEO_KEYWORDS.map(kw =>
  new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
);

function isGeopoliticalTerm(term: string): boolean {
  return GEO_PATTERNS.some(pattern => pattern.test(term));
}

export async function fetchGoogleTrends(): Promise<void> {
  if (!isBigQueryAvailable()) {
    console.log('[TRENDS] BigQuery not available, skipping');
    return;
  }

  console.log('[TRENDS] Fetching Google Trends from BigQuery (7-day window)...');

  try {
    const [risingRows, topRows] = await Promise.all([
      bqQuery<TrendRow>(RISING_QUERY),
      bqQuery<TrendRow>(TOP_QUERY),
    ]);

    console.log(`[TRENDS] BQ returned ${risingRows.length} rising rows, ${topRows.length} top rows`);

    // Build term → countries map
    const termMap = new Map<string, {
      countries: Map<string, { code: string; name: string; score: number; rank: number }>;
      isRising: boolean;
    }>();

    for (const row of risingRows) {
      const key = row.term.toLowerCase();
      if (!termMap.has(key)) {
        termMap.set(key, { countries: new Map(), isRising: true });
      }
      termMap.get(key)!.countries.set(row.country_code, {
        code: row.country_code, name: row.country_name,
        score: row.score, rank: row.rank,
      });
    }

    for (const row of topRows) {
      const key = row.term.toLowerCase();
      if (!termMap.has(key)) {
        termMap.set(key, { countries: new Map(), isRising: false });
      }
      const entry = termMap.get(key)!;
      if (!entry.countries.has(row.country_code)) {
        entry.countries.set(row.country_code, {
          code: row.country_code, name: row.country_name,
          score: row.score, rank: row.rank,
        });
      }
    }

    // Convert to signals
    const allSignals: TrendSignal[] = Array.from(termMap.entries()).map(([term, data]) => {
      const countries = Array.from(data.countries.values());
      const count = countries.length;
      const maxScore = Math.max(...countries.map(c => c.score));
      const isGeo = isGeopoliticalTerm(term);
      return {
        term,
        countries,
        countryCount: count,
        maxScore,
        isRising: data.isRising,
        isGeopolitical: isGeo,
        signal: count >= 5 ? 'critical' as const : count >= 3 ? 'strong' as const : count >= 2 ? 'moderate' as const : 'weak' as const,
      };
    });

    const geoTerms = allSignals
      .filter(s => s.isGeopolitical)
      .sort((a, b) => b.countryCount - a.countryCount || b.maxScore - a.maxScore)
      .slice(0, 30);

    const multiCountry = allSignals
      .filter(s => s.countryCount >= 2)
      .sort((a, b) => b.countryCount - a.countryCount || b.maxScore - a.maxScore)
      .slice(0, 30);

    // Top rising per country (for AI Brief context)
    const topRisingByCountry: Record<string, { term: string; score: number }[]> = {};
    for (const row of risingRows) {
      if (!topRisingByCountry[row.country_code]) {
        topRisingByCountry[row.country_code] = [];
      }
      if (topRisingByCountry[row.country_code].length < 5) {
        topRisingByCountry[row.country_code].push({ term: row.term, score: row.score });
      }
    }

    const refreshDate = risingRows[0]?.refresh_date;
    const refreshStr = typeof refreshDate === 'object' && refreshDate !== null
      ? (refreshDate as { value: string }).value
      : String(refreshDate ?? 'unknown');

    const result: GoogleTrendsData = {
      geoTerms,
      multiCountrySignals: multiCountry,
      topRisingByCountry,
      updatedAt: new Date().toISOString(),
      refreshDate: refreshStr,
    };

    await cache.setWithRedis('google_trends', result, 12 * 60 * 60 * 1000, 24 * 3600); // 12h mem, 24h Redis

    // Store daily snapshot for historical comparison
    const today = new Date().toISOString().slice(0, 10);
    await redisSet(`trends:snapshot:${today}`, {
      geoTerms: geoTerms.slice(0, 10),
      multiCountry: multiCountry.slice(0, 10),
    }, 30 * 24 * 3600); // 30 day TTL

    const criticalCount = geoTerms.filter(t => t.signal === 'critical' || t.signal === 'strong').length;
    console.log(`[TRENDS] ${geoTerms.length} geo terms, ${criticalCount} strong+ signals, ${Object.keys(topRisingByCountry).length} countries`);
  } catch (err) {
    console.error('[TRENDS] Failed:', err instanceof Error ? err.message : err);
  }
}
