import { bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { TTL } from '../config.js';
import { translateTexts } from './translate.js';
import type { NewsPoint, NewsWireItem, NewsBullet } from '../types.js';

interface BQNewsRow {
  category: string;
  SOURCEURL: string;
  Title: string;
  AvgTone: number;
  ActionGeo_Lat: number;
  ActionGeo_Long: number;
  domain: string;
  SQLDATE: string;
  Actor1CountryCode: string;
  Actor2CountryCode: string;
}

// Category definitions map to CAMEO event codes + keyword filters
const NEWS_QUERY = `
WITH categorized AS (
  SELECT
    SOURCEURL,
    AvgTone,
    ActionGeo_Lat,
    ActionGeo_Long,
    REGEXP_EXTRACT(SOURCEURL, r'https?://(?:www\\.)?([^/]+)') as domain,
    CAST(SQLDATE AS STRING) as SQLDATE,
    Actor1CountryCode,
    Actor2CountryCode,

    CASE
      WHEN EventRootCode IN ('18','19','20') THEN 'conflict'
      WHEN EventRootCode IN ('14','15') THEN 'conflict'
      WHEN (Actor1CountryCode = 'USA' OR Actor2CountryCode = 'USA')
           AND EventRootCode IN ('03','04','05','10','12') THEN 'us_politics'
      WHEN (Actor1CountryCode IN ('IRN') OR Actor2CountryCode IN ('IRN'))
           AND GoldsteinScale < -5 THEN 'nuclear'
      WHEN (Actor1CountryCode IN ('CHN','TWN') OR Actor2CountryCode IN ('CHN','TWN'))
           AND GoldsteinScale < -3 THEN 'china_threat'
      WHEN (Actor1CountryCode IN ('RUS','UKR') OR Actor2CountryCode IN ('RUS','UKR'))
           AND EventRootCode IN ('14','15','17','18','19','20') THEN 'russia_ukraine'
      WHEN (Actor1CountryCode IN ('ISR','PSE','LBN','YEM','SYR')
           OR Actor2CountryCode IN ('ISR','PSE','LBN','YEM','SYR'))
           AND GoldsteinScale < -3 THEN 'middle_east'
      WHEN EventRootCode IN ('18','19','20') THEN 'crisis'
      ELSE NULL
    END as category
  FROM \`gdelt-bq.gdeltv2.events\`
  WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
    AND ActionGeo_Lat IS NOT NULL
    AND ActionGeo_Long IS NOT NULL
    AND AvgTone IS NOT NULL
    AND SOURCEURL IS NOT NULL
)
SELECT * FROM categorized
WHERE category IS NOT NULL
ORDER BY ABS(AvgTone) DESC
LIMIT 2000
`;

function formatDomain(domain: string | undefined): string {
  if (!domain) return 'GDELT';
  let name = domain.replace(/^www\./, '');
  name = name.replace(/\.(com|org|net|gov|int|edu|mil|io|info)(\.\w{2})?$/i, '');
  name = name.replace(/\.co(\.\w{2})?$/i, '');
  return name.split(/[.\-]/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') || 'GDELT';
}

function newsToWire(news: NewsPoint[], fetchedAt: number): NewsWireItem[] {
  const sorted = [...news].sort((a, b) => a.tone - b.tone);
  return sorted.slice(0, 20).map((n, i) => {
    let bullet: NewsBullet = 'medium';
    if (n.tone < -7) bullet = 'critical';
    else if (n.tone < -4) bullet = 'high';
    else if (n.tone > 0) bullet = 'accent';
    const elapsedMin = Math.floor((Date.now() - fetchedAt) / 60_000);
    return {
      id: `nw-${i}`,
      bullet,
      source: n.source,
      time: elapsedMin < 1 ? 'now' : `${elapsedMin}m`,
      headline: n.headline,
      tone: n.tone,
    };
  });
}

export async function fetchGdeltNewsBQ(): Promise<void> {
  console.log('[GDELT-BQ] Fetching news from BigQuery...');

  try {
    const rows = await bqQuery<BQNewsRow>(NEWS_QUERY);
    console.log(`[GDELT-BQ] Got ${rows.length} events from BigQuery`);

    const points: NewsPoint[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      // Deduplicate by geo + domain
      const key = `${row.ActionGeo_Lat.toFixed(1)}_${row.ActionGeo_Long.toFixed(1)}_${row.domain}`;
      if (seen.has(key)) continue;
      seen.add(key);

      points.push({
        id: `bq-${row.category}-${points.length}`,
        lat: row.ActionGeo_Lat,
        lng: row.ActionGeo_Long,
        tone: row.AvgTone,
        headline: row.Title || `Event: ${row.Actor1CountryCode || '?'} → ${row.Actor2CountryCode || '?'}`,
        source: formatDomain(row.domain),
        category: row.category,
      });
    }

    // Translate non-English headlines
    const headlines = points.map(p => p.headline);
    const translated = await translateTexts(headlines, 'GDELT-BQ');
    for (let i = 0; i < points.length; i++) {
      points[i].headline = translated[i];
    }

    const fetchedAt = Date.now();
    cache.set('news', points, TTL.NEWS);
    console.log(`[GDELT-BQ] ${points.length} unique news points cached`);

    const wire = newsToWire(points, fetchedAt);
    cache.set('newswire', wire, TTL.NEWS);
  } catch (err) {
    console.error('[GDELT-BQ] Failed:', err instanceof Error ? err.message : err);
  }
}
