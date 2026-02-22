import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';

const FIRMS_API_KEY = process.env.FIRMS_API_KEY ?? '';


function normalizeConfidence(conf: string): number {
  switch (conf?.toLowerCase?.()) {
    case 'h': case 'high': return 95;
    case 'n': case 'nominal': return 70;
    case 'l': case 'low': return 30;
    default: {
      const num = Number(conf);
      return isNaN(num) ? 50 : num;
    }
  }
}

export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;       // Kelvin — higher = more intense
  confidence: number;       // 0-100 normalized
  frp: number;              // Fire Radiative Power (MW)
  acq_date: string;
  acq_time: string;
  country_id: string;
  daynight: 'D' | 'N';
}

// Regions of interest — bounding boxes [west, south, east, north]
const REGIONS: Record<string, [number, number, number, number]> = {
  middle_east:   [30, 12, 60, 42],
  ukraine:       [22, 44, 40, 53],
  gaza:          [34.0, 31.2, 34.6, 31.6],
  sudan:         [22, 3, 39, 23],
  myanmar:       [92, 10, 101, 28],
};

async function fetchRegion(name: string, bbox: [number, number, number, number]): Promise<FireHotspot[]> {
  const [west, south, east, north] = bbox;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${FIRMS_API_KEY}/VIIRS_SNPP_NRT/${west},${south},${east},${north}/1`;

  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
  if (!res.ok) throw new Error(`FIRMS ${name}: HTTP ${res.status}`);

  const text = await res.text();
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',');
  const latIdx = headers.indexOf('latitude');
  const lonIdx = headers.indexOf('longitude');
  const brightIdx = headers.indexOf('bright_ti4');
  const confIdx = headers.indexOf('confidence');
  const frpIdx = headers.indexOf('frp');
  const dateIdx = headers.indexOf('acq_date');
  const timeIdx = headers.indexOf('acq_time');
  const countryIdx = headers.indexOf('country_id');
  const dnIdx = headers.indexOf('daynight');

  return lines.slice(1).map(line => {
    const cols = line.split(',');
    return {
      latitude: parseFloat(cols[latIdx]),
      longitude: parseFloat(cols[lonIdx]),
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: normalizeConfidence(cols[confIdx] ?? 'nominal'),
      frp: parseFloat(cols[frpIdx]) || 0,
      acq_date: cols[dateIdx] ?? '',
      acq_time: cols[timeIdx] ?? '',
      country_id: cols[countryIdx] ?? '',
      daynight: (cols[dnIdx] ?? 'D') as 'D' | 'N',
    };
  }).filter(h => !isNaN(h.latitude) && !isNaN(h.longitude));
}

export async function fetchFirmsHotspots(): Promise<void> {
  if (!FIRMS_API_KEY) {
    console.warn('[FIRMS] No FIRMS_API_KEY set, skipping');
    return;
  }
  console.log('[FIRMS] Fetching satellite fire hotspots...');

  try {
    const allHotspots: FireHotspot[] = [];

    for (const [name, bbox] of Object.entries(REGIONS)) {
      try {
        const hotspots = await withCircuitBreaker(
          'firms',
          () => fetchRegion(name, bbox),
          () => [] as FireHotspot[],
        );
        allHotspots.push(...hotspots);
        console.log(`[FIRMS] ${name}: ${hotspots.length} hotspots`);
      } catch (err) {
        console.warn(`[FIRMS] ${name} failed:`, err instanceof Error ? err.message : err);
      }
      await new Promise(r => setTimeout(r, 500)); // rate limit
    }

    // Deduplicate by lat/lon rounded to 3 decimals
    const seen = new Set<string>();
    const deduped = allHotspots.filter(h => {
      const key = `${h.latitude.toFixed(3)}_${h.longitude.toFixed(3)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by FRP descending (most intense fires first)
    deduped.sort((a, b) => b.frp - a.frp);

    cache.set('fire_hotspots', deduped.slice(0, 500), TTL.FIRMS);
    console.log(`[FIRMS] ${deduped.length} unique hotspots cached`);
  } catch (err) {
    console.error('[FIRMS] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
