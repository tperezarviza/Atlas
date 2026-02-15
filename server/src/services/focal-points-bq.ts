import { bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { redisGet, redisSet } from '../redis.js';
import { TTL } from '../config.js';
import type { FocalPoint } from './focal-points.js';
import type { NewsPoint, FeedItem, TwitterIntelItem, Conflict, HostilityPair, InternetIncident } from '../types.js';

interface BQEntityRow {
  entity: string;
  entity_type: string;
  mention_count: number;
  avg_tone: number;
  source_domains: string[];
  themes: string[];
}

// Extract entities directly from GKG — no Claude needed
const ENTITIES_QUERY = `
WITH
persons AS (
  SELECT
    TRIM(person) as entity,
    'person' as entity_type,
    COUNT(*) as mention_count,
    AVG(SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64)) as avg_tone,
    ARRAY_AGG(DISTINCT REGEXP_EXTRACT(DocumentIdentifier, r'https?://(?:www\\.)?([^/]+)') IGNORE NULLS LIMIT 5) as source_domains,
    ARRAY_AGG(DISTINCT SPLIT(V2Themes, ';')[SAFE_OFFSET(0)] IGNORE NULLS LIMIT 3) as themes
  FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(V2Persons, ';')) AS person
  WHERE DATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)) AS INT64)
    AND V2Persons != ''
    AND TRIM(person) != ''
  GROUP BY entity
  HAVING COUNT(*) >= 3
),
orgs AS (
  SELECT
    TRIM(org) as entity,
    'organization' as entity_type,
    COUNT(*) as mention_count,
    AVG(SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64)) as avg_tone,
    ARRAY_AGG(DISTINCT REGEXP_EXTRACT(DocumentIdentifier, r'https?://(?:www\\.)?([^/]+)') IGNORE NULLS LIMIT 5) as source_domains,
    ARRAY_AGG(DISTINCT SPLIT(V2Themes, ';')[SAFE_OFFSET(0)] IGNORE NULLS LIMIT 3) as themes
  FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(V2Organizations, ';')) AS org
  WHERE DATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)) AS INT64)
    AND V2Organizations != ''
    AND TRIM(org) != ''
  GROUP BY entity
  HAVING COUNT(*) >= 3
),
countries AS (
  SELECT
    TRIM(SPLIT(loc, '#')[SAFE_OFFSET(1)]) as entity,
    'country' as entity_type,
    COUNT(*) as mention_count,
    AVG(SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64)) as avg_tone,
    ARRAY_AGG(DISTINCT REGEXP_EXTRACT(DocumentIdentifier, r'https?://(?:www\\.)?([^/]+)') IGNORE NULLS LIMIT 5) as source_domains,
    ARRAY_AGG(DISTINCT SPLIT(V2Themes, ';')[SAFE_OFFSET(0)] IGNORE NULLS LIMIT 3) as themes
  FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(V2Locations, ';')) AS loc
  WHERE DATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d%H%M%S', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)) AS INT64)
    AND V2Locations != ''
    AND SPLIT(loc, '#')[SAFE_OFFSET(0)] = '1'
  GROUP BY entity
  HAVING COUNT(*) >= 5 AND entity != ''
)
SELECT * FROM (
  SELECT * FROM persons
  UNION ALL
  SELECT * FROM orgs
  UNION ALL
  SELECT * FROM countries
)
ORDER BY mention_count DESC
LIMIT 50
`;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function detectFocalPointsBQ(): Promise<void> {
  console.log('[FOCAL-BQ] Detecting focal points via BigQuery GKG entities...');

  try {
    const bqEntities = await bqQuery<BQEntityRow>(ENTITIES_QUERY);
    console.log(`[FOCAL-BQ] Got ${bqEntities.length} entities from BigQuery GKG`);

    // Also get local cache data for cross-referencing
    const news = cache.get<NewsPoint[]>('news') ?? [];
    const feed = cache.get<FeedItem[]>('feed') ?? [];
    const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
    const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
    const hostility = cache.get<HostilityPair[]>('hostility') ?? [];
    const ooni = cache.get<InternetIncident[]>('ooni') ?? [];

    // Build entity map with BQ data + local cross-reference
    const entityMap = new Map<string, {
      entity: string;
      type: string;
      bqMentions: number;
      bqTone: number;
      bqDomains: string[];
      bqThemes: string[];
      sources: Map<string, { count: number; sample: string }>;
    }>();

    for (const row of bqEntities) {
      const key = row.entity.toLowerCase();
      entityMap.set(key, {
        entity: row.entity,
        type: row.entity_type,
        bqMentions: row.mention_count,
        bqTone: row.avg_tone,
        bqDomains: row.source_domains || [],
        bqThemes: row.themes || [],
        sources: new Map(),
      });

      // BigQuery GKG is itself a source
      entityMap.get(key)!.sources.set('gdelt', {
        count: row.mention_count,
        sample: `${row.mention_count} articles, avg tone ${row.avg_tone?.toFixed(1) ?? '?'}`,
      });

      // Cross-reference against local cached sources
      const pattern = new RegExp(`\\b${escapeRegex(row.entity)}\\b`, 'i');

      const rssHits = feed.filter(f => pattern.test(f.text));
      if (rssHits.length > 0) {
        entityMap.get(key)!.sources.set('rss', {
          count: rssHits.length,
          sample: rssHits[0].text.slice(0, 120),
        });
      }

      const twitterHits = tweets.filter(t => pattern.test(t.text));
      if (twitterHits.length > 0) {
        entityMap.get(key)!.sources.set('twitter', {
          count: twitterHits.length,
          sample: twitterHits[0].text.slice(0, 120),
        });
      }

      const acledHits = conflicts.filter(c => pattern.test(c.name) || pattern.test(c.region));
      if (acledHits.length > 0) {
        entityMap.get(key)!.sources.set('acled', {
          count: acledHits.length,
          sample: acledHits[0].name,
        });
      }

      const hostilityHits = hostility.filter(h =>
        pattern.test(h.countryA) || pattern.test(h.countryB)
      );
      if (hostilityHits.length > 0) {
        entityMap.get(key)!.sources.set('hostility', {
          count: hostilityHits.length,
          sample: `${hostilityHits[0].countryA}-${hostilityHits[0].countryB}: tone ${hostilityHits[0].avgTone}`,
        });
      }

      const ooniHits = ooni.filter(i => pattern.test(i.country));
      if (ooniHits.length > 0) {
        entityMap.get(key)!.sources.set('ooni', {
          count: ooniHits.length,
          sample: `Shutdown in ${ooniHits[0].country}`,
        });
      }
    }

    // Get previous focal points for trend comparison
    const previousFocals = await redisGet<FocalPoint[]>('focal:previous') ?? [];
    const prevMap = new Map(previousFocals.map(f => [f.entity.toLowerCase(), f]));

    // Build focal points (require 2+ source types)
    const focalPoints: FocalPoint[] = [];

    for (const [key, entry] of entityMap) {
      if (entry.sources.size < 2) continue;

      const sources = Array.from(entry.sources.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        sample: data.sample,
      }));

      const score = sources.reduce((sum, s) => {
        const weight = s.type === 'gdelt' ? 2 : s.type === 'twitter' ? 1.5
          : s.type === 'acled' ? 3 : s.type === 'hostility' ? 2.5 : 1;
        return sum + s.count * weight;
      }, 0) + entry.sources.size * 5;

      const prev = prevMap.get(key);
      let trend: FocalPoint['trend'] = 'new';
      if (prev) {
        const diff = score - prev.score;
        trend = diff > 5 ? 'rising' : diff < -5 ? 'falling' : 'stable';
      }

      focalPoints.push({
        entity: entry.entity,
        entityType: entry.type as FocalPoint['entityType'],
        score: Math.round(score),
        sources,
        sourceTypeCount: entry.sources.size,
        trend,
        firstSeen: prev?.firstSeen ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    focalPoints.sort((a, b) => b.score - a.score);
    const top = focalPoints.slice(0, 15);

    await redisSet('focal:previous', top, 24 * 3600);
    cache.set('focal_points', top, TTL.FOCAL_POINTS);
    console.log(`[FOCAL-BQ] ${top.length} focal points. Top: ${top.slice(0, 3).map(f => `${f.entity}(${f.score})`).join(', ')}`);
  } catch (err) {
    console.error('[FOCAL-BQ] Failed:', err instanceof Error ? err.message : err);
  }
}
