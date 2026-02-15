import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { ConnectionType } from '../types.js';

interface BQCoOccurrence {
  entity_a: string;
  entity_b: string;
  co_mention_count: number;
  avg_tone: number;
  themes: string[];
}

// Find entities frequently co-mentioned in same articles (6h window)
const CO_OCCURRENCE_QUERY = `
WITH article_entities AS (
  SELECT
    DocumentIdentifier as doc_url,
    TRIM(person) as entity,
    'person' as entity_type,
    SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64) as tone,
    SPLIT(V2Themes, ';')[SAFE_OFFSET(0)] as theme
  FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(V2Persons, ';')) AS person
  WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
    AND V2Persons != ''

  UNION ALL

  SELECT
    DocumentIdentifier,
    TRIM(org),
    'organization',
    SAFE_CAST(SPLIT(V2Tone, ',')[SAFE_OFFSET(0)] AS FLOAT64),
    SPLIT(V2Themes, ';')[SAFE_OFFSET(0)]
  FROM \`gdelt-bq.gdeltv2.gkg\`,
    UNNEST(SPLIT(V2Organizations, ';')) AS org
  WHERE _PARTITIONTIME >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 6 HOUR)
    AND V2Organizations != ''
),
significant_entities AS (
  SELECT entity
  FROM article_entities
  GROUP BY entity
  HAVING COUNT(DISTINCT doc_url) >= 5 AND entity != ''
),
pairs AS (
  SELECT
    a.entity as entity_a,
    b.entity as entity_b,
    a.doc_url,
    (a.tone + b.tone) / 2 as pair_tone,
    a.theme
  FROM article_entities a
  JOIN article_entities b ON a.doc_url = b.doc_url AND a.entity < b.entity
  WHERE a.entity IN (SELECT entity FROM significant_entities)
    AND b.entity IN (SELECT entity FROM significant_entities)
)
SELECT
  entity_a,
  entity_b,
  COUNT(DISTINCT doc_url) as co_mention_count,
  AVG(pair_tone) as avg_tone,
  ARRAY_AGG(DISTINCT theme IGNORE NULLS LIMIT 3) as themes
FROM pairs
GROUP BY entity_a, entity_b
HAVING COUNT(DISTINCT doc_url) >= 3
ORDER BY co_mention_count DESC
LIMIT 30
`;

function classifyConnectionType(themes: string[], tone: number): ConnectionType {
  const themeStr = (themes || []).join(' ').toUpperCase();
  if (themeStr.includes('MILITARY') || themeStr.includes('ARMED')) return 'military';
  if (themeStr.includes('CYBER')) return 'cyber';
  if (themeStr.includes('ALLIANCE') || themeStr.includes('COOPERATION')) return 'alliance';
  if (tone < -5) return 'proxy_war';
  if (themeStr.includes('TRADE') || themeStr.includes('SANCTION')) return 'arms_flow';
  return 'spillover';
}

export async function fetchConnectionsBQ(): Promise<void> {
  if (!isBigQueryAvailable()) return;

  console.log('[CONNECTIONS-BQ] Computing entity co-occurrence via BigQuery...');

  try {
    const rows = await bqQuery<BQCoOccurrence>(CO_OCCURRENCE_QUERY);
    console.log(`[CONNECTIONS-BQ] ${rows.length} co-occurrence pairs found`);

    cache.set('entity_connections', rows.map(r => ({
      entityA: r.entity_a,
      entityB: r.entity_b,
      strength: r.co_mention_count,
      tone: Math.round(r.avg_tone * 100) / 100,
      type: classifyConnectionType(r.themes, r.avg_tone),
      themes: r.themes || [],
    })), TTL.CONNECTIONS);

    console.log(`[CONNECTIONS-BQ] Entity connections cached`);
  } catch (err) {
    console.error('[CONNECTIONS-BQ] Failed:', err instanceof Error ? err.message : err);
  }
}
