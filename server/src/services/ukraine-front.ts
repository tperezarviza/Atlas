import * as cheerio from 'cheerio';
import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { UkraineFrontData } from '../types.js';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// --- Option A: DeepStateMap ---
async function tryDeepStateMap(): Promise<UkraineFrontData | null> {
  try {
    // DeepStateMap provides historical data via API
    const res = await fetch('https://deepstatemap.live/api/history/', {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;

    const data = await res.json() as any;
    if (!data || (Array.isArray(data) && data.length === 0)) return null;

    // DeepStateMap returns GeoJSON-like data with front line features
    return {
      source: 'deepstatemap',
      front_line_geojson: data,
      recent_events: [],
      territory_summary: 'Data sourced from DeepStateMap.live',
      last_updated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// --- Option B: ISW Daily Assessment ---
async function tryISW(): Promise<UkraineFrontData | null> {
  try {
    const res = await fetch('https://www.understandingwar.org/backgrounder/ukraine-conflict-updates', {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const $ = cheerio.load(html);

    // Find latest assessment link and image
    let assessmentText = '';
    let mapImageUrl = '';

    // ISW typically has article links with dates
    const latestLink = $('a[href*="russian-offensive-campaign"], a[href*="ukraine-conflict-update"]').first();
    const latestTitle = latestLink.text().trim() || '';

    // Try to find map image
    $('img[src*="map"], img[alt*="map"], img[src*="ukraine"], img[alt*="Ukraine"]').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src && !mapImageUrl) {
        mapImageUrl = src.startsWith('http') ? src : `https://www.understandingwar.org${src}`;
      }
    });

    // Get text summary from latest article
    $('div.field-content, article .body, .node-content').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 100 && !assessmentText) {
        assessmentText = text.slice(0, 1000);
      }
    });

    if (!assessmentText && !mapImageUrl && !latestTitle) return null;

    return {
      source: 'isw',
      isw_map_image_url: mapImageUrl || undefined,
      isw_assessment_text: (latestTitle ? `${latestTitle}\n\n` : '') + assessmentText,
      recent_events: [],
      territory_summary: 'Assessment sourced from Institute for the Study of War (ISW)',
      last_updated: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

// --- Option C: ACLED Ukraine events (uses already-cached ACLED data) ---
function tryACLED(): UkraineFrontData | null {
  // Pull ACLED conflicts from cache and filter Ukraine events
  const conflicts = cache.get<any[]>('conflicts');
  if (!conflicts) return null;

  const ukraineEvents = conflicts
    .filter((c: any) => {
      const name = (c.name || c.country || '').toLowerCase();
      return name.includes('ukraine') || name.includes('russia-ukraine');
    });

  if (ukraineEvents.length === 0) return null;

  return {
    source: 'acled_static',
    recent_events: ukraineEvents.map((e: any, i: number) => ({
      id: `ua-${i}`,
      date: e.since || e.date || '',
      location: e.name || '',
      type: e.trend || 'conflict',
      fatalities: 0,
      lat: e.lat || 48.37,
      lng: e.lng || 35.18,
    })),
    territory_summary: 'Approximate data from ACLED conflict tracking',
    last_updated: new Date().toISOString(),
  };
}

export async function fetchUkraineFront(): Promise<void> {
  if (cache.isFresh('ukraine_front')) return;
  console.log('[UKRAINE] Fetching front line data...');

  try {
    // Try sources in priority order
    let data = await tryDeepStateMap();

    if (!data) {
      console.log('[UKRAINE] DeepStateMap unavailable, trying ISW...');
      data = await tryISW();
    }

    if (!data) {
      console.log('[UKRAINE] ISW unavailable, falling back to ACLED...');
      data = tryACLED();
    }

    if (data) {
      cache.set('ukraine_front', data, TTL.UKRAINE_FRONT);
      console.log(`[UKRAINE] Cached front data (source: ${data.source})`);
    } else {
      console.warn('[UKRAINE] No source available, using mock');
    }
  } catch (err) {
    console.error('[UKRAINE] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
