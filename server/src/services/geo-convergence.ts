import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';

export interface ConvergenceHotspot {
  id: string;
  lat: number;
  lng: number;
  gridLat: number;
  gridLng: number;
  eventTypes: string[];
  totalEvents: number;
  avgTone: number;
  score: number;
}

// 1 x 1 degree grid convergence detection
const CONVERGENCE_QUERY = `
WITH gridded AS (
  SELECT
    FLOOR(ActionGeo_Lat) as grid_lat,
    FLOOR(ActionGeo_Long) as grid_lng,
    CASE
      WHEN EventRootCode IN ('18','19','20') THEN 'violence'
      WHEN EventRootCode IN ('14','15') THEN 'protest'
      WHEN EventRootCode IN ('17') THEN 'coercion'
      WHEN EventRootCode IN ('10','11','12','13') THEN 'demand'
      ELSE 'other'
    END as event_type,
    AvgTone,
    ActionGeo_Lat,
    ActionGeo_Long
  FROM \`gdelt-bq.gdeltv2.events\`
  WHERE SQLDATE >= CAST(FORMAT_TIMESTAMP('%Y%m%d', TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 DAY)) AS INT64)
    AND ActionGeo_Lat IS NOT NULL
    AND ActionGeo_Long IS NOT NULL
    AND EventRootCode IN ('10','11','12','13','14','15','17','18','19','20')
)
SELECT
  grid_lat,
  grid_lng,
  ARRAY_AGG(DISTINCT event_type) as event_types,
  COUNT(*) as total_events,
  AVG(AvgTone) as avg_tone,
  AVG(ActionGeo_Lat) as center_lat,
  AVG(ActionGeo_Long) as center_lng
FROM gridded
GROUP BY grid_lat, grid_lng
HAVING COUNT(DISTINCT event_type) >= 3
ORDER BY COUNT(DISTINCT event_type) DESC, COUNT(*) DESC
LIMIT 20
`;

export async function detectGeoConvergence(): Promise<void> {
  if (!isBigQueryAvailable()) {
    console.log('[GEO-CONV] BigQuery not available, skipping');
    return;
  }

  console.log('[GEO-CONV] Detecting geographic convergence via BigQuery...');

  try {
    const rows = await bqQuery<{
      grid_lat: number; grid_lng: number; event_types: string[];
      total_events: number; avg_tone: number; center_lat: number; center_lng: number;
    }>(CONVERGENCE_QUERY);

    const hotspots: ConvergenceHotspot[] = rows.map((row, i) => ({
      id: `conv-${i}`,
      lat: row.center_lat,
      lng: row.center_lng,
      gridLat: row.grid_lat + 0.5,
      gridLng: row.grid_lng + 0.5,
      eventTypes: row.event_types,
      totalEvents: row.total_events,
      avgTone: Math.round(row.avg_tone * 100) / 100,
      score: row.event_types.length * 10 + Math.min(row.total_events, 50),
    }));

    cache.set('geo_convergence', hotspots, 30 * 60 * 1000); // 30 min TTL
    console.log(`[GEO-CONV] ${hotspots.length} convergence hotspots detected`);
  } catch (err) {
    console.error('[GEO-CONV] Failed:', err instanceof Error ? err.message : err);
  }
}
