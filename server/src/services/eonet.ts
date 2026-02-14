import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { NaturalEvent, EventSeverity } from '../types.js';

const BASE = 'https://eonet.gsfc.nasa.gov/api/v3';

const CATEGORY_MAP: Record<string, string> = {
  wildfires: 'Wildfires',
  severeStorms: 'Severe Storms',
  volcanoes: 'Volcanoes',
  earthquakes: 'Earthquakes',
  floods: 'Floods',
  seaLakeIce: 'Sea & Lake Ice',
  drought: 'Drought',
  landslides: 'Landslides',
  dustHaze: 'Dust & Haze',
  snow: 'Snow',
  tempExtremes: 'Temperature Extremes',
  waterColor: 'Water Color',
  manmade: 'Man-Made',
};

function classifySeverity(event: any): EventSeverity {
  const title = (event.title || '').toLowerCase();
  const cats = (event.categories || []).map((c: any) => (c.id || c.title || '').toLowerCase());

  // Earthquake by magnitude
  if (cats.some((c: string) => c.includes('earthquake'))) {
    const magMatch = title.match(/(\d+\.?\d*)\s*(magnitude|m\b)/i) || title.match(/m\s*(\d+\.?\d*)/i);
    if (magMatch) {
      const mag = parseFloat(magMatch[1]);
      if (mag >= 7) return 'extreme';
      if (mag >= 5.5) return 'severe';
      if (mag >= 4) return 'moderate';
      return 'minor';
    }
  }

  // Storms by category
  if (cats.some((c: string) => c.includes('storm'))) {
    if (/category\s*[45]|super\s*typhoon|cat\s*[45]/i.test(title)) return 'extreme';
    if (/category\s*3|major|cat\s*3/i.test(title)) return 'severe';
    if (/hurricane|typhoon|cyclone/i.test(title)) return 'moderate';
    return 'minor';
  }

  // Volcanoes
  if (cats.some((c: string) => c.includes('volcano'))) {
    if (/eruption|explosive|plinian/i.test(title)) return 'severe';
    return 'moderate';
  }

  // Floods
  if (cats.some((c: string) => c.includes('flood'))) {
    if (/catastrophic|major|deadly/i.test(title)) return 'severe';
    return 'moderate';
  }

  // Wildfires
  if (cats.some((c: string) => c.includes('wildfire') || c.includes('fire'))) {
    if (/major|catastrophic|evacuation/i.test(title)) return 'severe';
    return 'moderate';
  }

  return 'minor';
}

export async function fetchNaturalEvents(): Promise<void> {
  if (cache.isFresh('natural_events')) return;
  console.log('[EONET] Fetching natural events...');

  try {
    const url = `${BASE}/events?status=open&limit=50`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) throw new Error(`EONET API ${res.status}`);

    const data = await res.json() as { events?: any[] };
    const events: NaturalEvent[] = (data.events || [])
      .map((e: any) => {
        const geo = e.geometry?.[e.geometry.length - 1]; // Latest geometry point
        const coords = geo?.coordinates || [0, 0];
        const cat = e.categories?.[0];
        const catId = cat?.id || '';

        return {
          id: e.id || '',
          title: e.title || '',
          category: CATEGORY_MAP[catId] || cat?.title || catId,
          source: e.sources?.[0]?.url || '',
          lat: coords[1] || 0,
          lng: coords[0] || 0,
          date: geo?.date || e.geometry?.[0]?.date || '',
          magnitude: geo?.magnitudeValue || undefined,
          severity: classifySeverity(e),
          link: e.link || '',
        } satisfies NaturalEvent;
      })
      .filter((e: NaturalEvent) => e.lat !== 0 || e.lng !== 0);

    // Sort: extreme/severe first
    const order: Record<string, number> = { extreme: 0, severe: 1, moderate: 2, minor: 3 };
    events.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

    cache.set('natural_events', events, TTL.EONET);
    console.log(`[EONET] Cached ${events.length} active natural events`);
  } catch (err) {
    console.error('[EONET] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
