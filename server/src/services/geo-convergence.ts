import { isBigQueryAvailable, bqQuery } from './bigquery.js';
import { cache } from '../cache.js';
import type { NewsPoint, Conflict } from '../types.js';
import type { Earthquake } from './earthquakes.js';

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

/** Fallback: compute convergence from in-memory cached data */
function computeFromCache(): ConvergenceHotspot[] {
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const earthquakes = cache.get<Earthquake[]>('earthquakes') ?? [];

  // Grid: key = "lat,lng" → { types set, events count, sumLat, sumLng, sumTone, count }
  const grid = new Map<string, {
    types: Set<string>;
    events: number;
    sumLat: number;
    sumLng: number;
    sumTone: number;
    count: number;
  }>();

  function addToGrid(lat: number, lng: number, eventType: string, tone: number) {
    const gLat = Math.floor(lat);
    const gLng = Math.floor(lng);
    const key = `${gLat},${gLng}`;
    let cell = grid.get(key);
    if (!cell) {
      cell = { types: new Set(), events: 0, sumLat: 0, sumLng: 0, sumTone: 0, count: 0 };
      grid.set(key, cell);
    }
    cell.types.add(eventType);
    cell.events++;
    cell.sumLat += lat;
    cell.sumLng += lng;
    cell.sumTone += tone;
    cell.count++;
  }

  // GDELT news → classify by tone/category
  for (const n of news) {
    if (n.lat == null || n.lng == null) continue;
    const type = n.tone < -5 ? 'crisis_news' : n.tone < -2 ? 'negative_news' : 'news';
    addToGrid(n.lat, n.lng, type, n.tone);
  }

  // ACLED conflicts
  for (const c of conflicts) {
    addToGrid(c.lat, c.lng, 'conflict', -5);
  }

  // USGS earthquakes
  for (const q of earthquakes) {
    addToGrid(q.lat, q.lng, 'earthquake', -2);
  }

  // Filter cells with 3+ distinct event types
  const hotspots: ConvergenceHotspot[] = [];
  let i = 0;

  for (const [key, cell] of grid) {
    if (cell.types.size < 3) continue;
    const [gLatStr, gLngStr] = key.split(',');
    const gLat = Number(gLatStr);
    const gLng = Number(gLngStr);
    const eventTypes = Array.from(cell.types);
    const avgTone = Math.round((cell.sumTone / cell.count) * 100) / 100;

    hotspots.push({
      id: `conv-cache-${i++}`,
      lat: cell.sumLat / cell.count,
      lng: cell.sumLng / cell.count,
      gridLat: gLat + 0.5,
      gridLng: gLng + 0.5,
      eventTypes,
      totalEvents: cell.events,
      avgTone,
      score: eventTypes.length * 10 + Math.min(cell.events, 50),
    });
  }

  // Sort by score descending, take top 20
  hotspots.sort((a, b) => b.score - a.score);
  return hotspots.slice(0, 20);
}

export async function detectGeoConvergence(): Promise<void> {
  if (isBigQueryAvailable()) {
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

      await cache.setWithRedis('geo_convergence', hotspots, 30 * 60 * 1000, 12 * 3600);
      console.log(`[GEO-CONV] ${hotspots.length} convergence hotspots detected`);
      return;
    } catch (err) {
      console.error('[GEO-CONV] BQ failed, falling back to cache:', err instanceof Error ? err.message : err);
    }
  }

  // Fallback: compute from in-memory cache
  console.log('[GEO-CONV] Computing convergence from cached data...');
  try {
    const hotspots = computeFromCache();
    cache.set('geo_convergence', hotspots, 30 * 60 * 1000);
    console.log(`[GEO-CONV] ${hotspots.length} convergence hotspots from cache`);
  } catch (err) {
    console.error('[GEO-CONV] Cache fallback failed:', err instanceof Error ? err.message : err);
  }
}
