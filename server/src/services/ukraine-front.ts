import * as cheerio from 'cheerio';
import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { translateTexts } from './translate.js';
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

// --- Option B: ISW Daily Assessment via RSS ---
async function tryISW(): Promise<UkraineFrontData | null> {
  try {
    // Use ISW RSS feed instead of scraping (more stable)
    const rssUrl = 'https://www.understandingwar.org/rss.xml';
    const res = await fetch(rssUrl, {
      headers: HEADERS,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) {
      // Fallback: try the publications page
      const pageRes = await fetch('https://www.understandingwar.org/publications', {
        headers: HEADERS,
        signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
      });
      if (!pageRes.ok) return null;

      const html = await pageRes.text();
      const $ = cheerio.load(html);

      // ISW uses views rows for publications listing
      const titles: string[] = [];
      $('h3 a, .views-field-title a, .node-title a, article h2 a').each((_, el) => {
        const text = $(el).text().trim();
        if (text && (text.toLowerCase().includes('ukraine') || text.toLowerCase().includes('russian'))) {
          titles.push(text);
        }
      });

      if (titles.length === 0) return null;

      return {
        source: 'isw',
        isw_assessment_text: titles.slice(0, 5).join('\n'),
        recent_events: titles.slice(0, 10).map((t, i) => ({
          id: `isw-${i}`,
          date: new Date().toISOString().split('T')[0],
          location: 'Ukraine',
          type: 'assessment',
          fatalities: 0,
          lat: 48.37 + (Math.random() - 0.5) * 4,
          lng: 35.18 + (Math.random() - 0.5) * 6,
        })),
        territory_summary: 'Assessment sourced from Institute for the Study of War (ISW)',
        last_updated: new Date().toISOString(),
      };
    }

    const xml = await res.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    const items: { title: string; description: string; link: string }[] = [];
    $('item').each((_, el) => {
      const title = $(el).find('title').text().trim();
      const description = $(el).find('description').text().trim();
      const link = $(el).find('link').text().trim();
      if (title.toLowerCase().includes('ukraine') || title.toLowerCase().includes('russian')) {
        items.push({ title, description: description.slice(0, 500), link });
      }
    });

    if (items.length === 0) return null;

    const assessmentText = items.slice(0, 3).map(i => i.title).join('\n');

    return {
      source: 'isw',
      isw_assessment_text: assessmentText,
      recent_events: items.slice(0, 10).map((item, i) => ({
        id: `isw-${i}`,
        date: new Date().toISOString().split('T')[0],
        location: 'Ukraine',
        type: 'assessment',
        fatalities: 0,
        lat: 48.37 + (Math.random() - 0.5) * 4,
        lng: 35.18 + (Math.random() - 0.5) * 6,
      })),
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
      const region = (c.region || '').toLowerCase();
      return name.includes('ukraine') || name.includes('russia-ukraine') ||
             region.includes('ukraine') || (c.lat && c.lat > 44 && c.lat < 53 && c.lng && c.lng > 22 && c.lng < 41);
    });

  if (ukraineEvents.length === 0) return null;

  return {
    source: 'acled',
    recent_events: ukraineEvents.slice(0, 20).map((e: any, i: number) => ({
      id: `ua-${i}`,
      date: e.since || e.date || new Date().toISOString().split('T')[0],
      location: e.name || e.location || 'Ukraine',
      type: e.trend || e.type || 'conflict',
      fatalities: e.fatalities || 0,
      lat: parseFloat(e.lat) || 48.37,
      lng: parseFloat(e.lng) || 35.18,
    })),
    territory_summary: `${ukraineEvents.length} conflict events tracked via ACLED`,
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
      // Translate assessment text if non-English (DeepStateMap may be Ukrainian)
      if (data.isw_assessment_text) {
        const [translated] = await translateTexts([data.isw_assessment_text], 'UKRAINE');
        data.isw_assessment_text = translated;
      }
      if (data.territory_summary) {
        const [translated] = await translateTexts([data.territory_summary], 'UKRAINE');
        data.territory_summary = translated;
      }

      await cache.setWithRedis('ukraine_front', data, TTL.UKRAINE_FRONT, 7200);
      console.log(`[UKRAINE] Cached front data (source: ${data.source})`);
    } else {
      console.warn('[UKRAINE] No source available, using mock');
    }
  } catch (err) {
    console.error('[UKRAINE] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
