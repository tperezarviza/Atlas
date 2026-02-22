import { FETCH_TIMEOUT_API, TTL, GDELT_BASE } from '../config.js';
import { cache } from '../cache.js';
import { translateTexts } from './translate.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import { isInPermanentZone } from '../utils/permanentZones.js';
import { aiComplete } from '../utils/ai-client.js';
import type { NewsPoint, NewsWireItem, NewsBullet } from '../types.js';
import type { FocalPoint } from './focal-points.js';
import type { EventSpike } from './bq-events.js';

interface GdeltFeature {
  type: string;
  geometry: { type: string; coordinates: [number, number] };
  properties: {
    name?: string;
    url?: string;
    domain?: string;
    urltone?: number;
    mentionednames?: string;
    html?: string;
    shareimage?: string;
  };
}

interface GdeltGeoJSON {
  type: string;
  features: GdeltFeature[];
}

const GDELT_QUERIES = [
  // Thematic queries
  { query: '(conflict OR war OR military OR attack OR strike)', category: 'conflict', timespan: '60m', maxpoints: 500 },
  { query: '(terrorism OR terrorist OR bombing)', category: 'terrorism', timespan: '60m', maxpoints: 200 },
  { query: '(trump OR tariff OR border OR immigration)', category: 'us_politics', timespan: '60m', maxpoints: 200 },
  { query: '(iran OR nuclear OR enrichment OR IAEA)', category: 'nuclear', timespan: '24h', maxpoints: 100 },
  { query: '(china OR taiwan OR "south china sea" OR PLA)', category: 'china_threat', timespan: '24h', maxpoints: 100 },
  { query: '(ukraine OR russia OR kharkiv OR kursk OR zelensky)', category: 'russia_ukraine', timespan: '60m', maxpoints: 200 },
  { query: '(israel OR gaza OR hamas OR hezbollah OR houthi)', category: 'middle_east', timespan: '60m', maxpoints: 200 },
  { query: '(oil OR energy OR OPEC OR gas OR pipeline)', category: 'energy', timespan: '60m', maxpoints: 200 },
  { query: 'crisis OR disaster OR emergency', category: 'crisis', timespan: '60m', maxpoints: 300 },
  // Regional crises — catch conflicts in areas not covered by thematic queries
  { query: '(haiti OR "port-au-prince" OR gang OR cartel) (crisis OR violence OR attack OR killed)', category: 'latam_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(sudan OR khartoum OR darfur OR RSF OR SAF) (war OR fighting OR displaced OR militia)', category: 'africa_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(myanmar OR "min aung" OR rohingya OR junta) (coup OR fighting OR resistance)', category: 'asia_crisis', timespan: '24h', maxpoints: 100 },
  { query: '(venezuela OR maduro) (protest OR crisis OR sanctions)', category: 'latam_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(ethiopia OR tigray OR amhara OR eritrea) (conflict OR fighting OR ceasefire)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(somalia OR al-shabaab) (attack OR killed OR military)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(libya OR sahel OR niger OR mali OR burkina) (coup OR militia OR junta OR insurgent)', category: 'africa_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(colombia OR "drug war" OR FARC OR ELN) (attack OR killed OR coca)', category: 'latam_crisis', timespan: '24h', maxpoints: 50 },
  { query: '(argentina OR milei OR "buenos aires" OR peso) (economy OR reform OR crisis OR protest OR congress)', category: 'argentina', timespan: '24h', maxpoints: 100 },
];

/** Extract the first article title from GDELT html field (contains <a> tags). */
function extractHeadline(html: string | undefined): string | undefined {
  if (!html) return undefined;
  // Try to extract text from the first <a> tag: <a ...>Title Here</a>
  const match = html.match(/<a[^>]*>([^<]+)<\/a>/);
  if (match?.[1]) {
    const text = match[1].trim();
    if (text && text !== 'No Title') return text;
  }
  // Fallback: strip all tags
  const plain = html.replace(/<[^>]*>/g, '').trim();
  return (plain && plain !== 'No Title') ? plain : undefined;
}

/** Decode common HTML entities in headlines. */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/** Extract the full URL from the first <a href="..."> in GDELT html. */
function extractFullUrl(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<a[^>]*href="(https?:\/\/[^"]+)"/);
  return match?.[1] ?? undefined;
}

/** Extract domain from the first <a href="..."> in GDELT html. */
function extractDomain(html: string | undefined): string | undefined {
  if (!html) return undefined;
  const match = html.match(/<a[^>]*href="https?:\/\/([^/"]+)/);
  return match?.[1] ?? undefined;
}

/** Batch-translate non-English headlines using the shared translate utility. */
async function translateHeadlines(points: NewsPoint[]): Promise<void> {
  const headlines = points.map((p) => p.headline);
  const translated = await translateTexts(headlines, 'GDELT');
  for (let i = 0; i < points.length; i++) {
    points[i].headline = translated[i];
  }
}

/** Convert a raw domain like "reuters.com" to a readable name like "Reuters". */
function formatDomain(domain: string | undefined): string {
  if (!domain) return 'GDELT';
  let name = domain.replace(/^www\./, '');
  name = name.replace(/\.(com|org|net|gov|int|edu|mil|io|info)(\.\w{2})?$/i, '');
  name = name.replace(/\.co(\.\w{2})?$/i, '');
  name = name
    .split(/[\.\-]/)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join(' ');
  return name || 'GDELT';
}

async function fetchGdeltQuery(
  query: string,
  category: string,
  timespan: string,
  maxpoints: number
): Promise<NewsPoint[]> {
  const url = `${GDELT_BASE}/api/v2/geo/geo?query=${encodeURIComponent(query)}&format=GeoJSON&timespan=${timespan}&maxpoints=${maxpoints}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) return [];

  const data: GdeltGeoJSON = await res.json();
  if (!data.features) return [];

  const now = new Date().toISOString();
  const points: NewsPoint[] = [];
  for (let i = 0; i < data.features.length; i++) {
    const f = data.features[i];
    const rawHeadline = extractHeadline(f.properties.html) ?? (f.properties.name !== 'No Title' ? f.properties.name : undefined) ?? 'Unknown';
    if (rawHeadline === 'Unknown' || rawHeadline.length < 10 || rawHeadline.startsWith('ERROR:')) continue;
    const headline = decodeEntities(rawHeadline);
    points.push({
      id: `gdelt-${category}-${i}`,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      tone: f.properties.urltone ?? 0,
      headline,
      source: formatDomain(extractDomain(f.properties.html) ?? f.properties.domain),
      category,
      fetchedAt: now,
      url: extractFullUrl(f.properties.html),
    });
  }
  return points;
}

function deduplicateNews(points: NewsPoint[]): NewsPoint[] {
  const seenByLocation = new Set<string>();
  const seenByHeadline = new Set<string>();
  return points.filter((p) => {
    // Dedup by location + headline prefix
    const locKey = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}_${p.headline.substring(0, 40).toLowerCase()}`;
    if (seenByLocation.has(locKey)) return false;
    seenByLocation.add(locKey);
    // Also dedup by headline alone (same story from different locations)
    const headKey = p.headline.substring(0, 60).toLowerCase();
    if (seenByHeadline.has(headKey)) return false;
    seenByHeadline.add(headKey);
    return true;
  });
}

async function filterRelevantNews(points: NewsPoint[]): Promise<NewsPoint[]> {
  if (points.length === 0) return [];

  const IRRELEVANT_RE = /\b(sports?|football|soccer|basketball|baseball|hockey|tennis|golf|cricket|boxing|wrestling|UFC|NASCAR|Formula.?1|Olympics|medal|championship|playoff|touchdown|quarterback|home.run|batting|rushing|celebrity|kardashian|reality.?tv|bachelor|oscar|grammy|emmy|box.office|album.chart|billboard|streaming|netflix|recipe|cooking|fashion|lifestyle|horoscope|zodiac|weather forecast|lottery|game show)\b/i;

  const afterRegex = points.filter(p => !IRRELEVANT_RE.test(p.headline));
  console.log(`[GDELT-FILTER] Regex: ${points.length} → ${afterRegex.length} (removed ${points.length - afterRegex.length})`);

  const BATCH_SIZE = 50;
  const relevant: NewsPoint[] = [];

  for (let i = 0; i < afterRegex.length; i += BATCH_SIZE) {
    const batch = afterRegex.slice(i, i + BATCH_SIZE);
    const headlines = batch.map((p, idx) => `${idx}: ${p.headline}`).join('\n');

    try {
      const response = await aiComplete(
        'You are a geopolitical intelligence filter. For each numbered headline, respond with ONLY the numbers of headlines relevant to: geopolitics, international relations, military/defense, politics, economics/markets, cyber/intelligence, terrorism, natural disasters, humanitarian crises. Exclude: sports, entertainment, celebrity, lifestyle, weather, local crime, human interest. Return ONLY a JSON array of numbers like [0,2,5,7].',
        headlines,
        { preferHaiku: true, maxTokens: 200 },
      );

      const kept = JSON.parse(response.text.match(/\[[\d,\s]*\]/)?.[0] ?? '[]') as number[];
      for (const idx of kept) {
        if (batch[idx]) relevant.push(batch[idx]);
      }
    } catch {
      relevant.push(...batch);
    }
  }

  console.log(`[GDELT-FILTER] Haiku: ${afterRegex.length} → ${relevant.length}`);
  return relevant;
}

async function getDynamicQueries(): Promise<typeof GDELT_QUERIES[number][]> {
  const dynamic: typeof GDELT_QUERIES[number][] = [];

  const focals = cache.get<FocalPoint[]>('focal_points') ?? [];
  const staticKeywords = GDELT_QUERIES.map(q => q.query.toLowerCase()).join(' ');

  for (const fp of focals.filter(f => f.score > 30)) {
    if (!staticKeywords.includes(fp.entity.toLowerCase())) {
      dynamic.push({
        query: `"${fp.entity}" (conflict OR crisis OR attack OR protest OR military)`,
        category: 'dynamic_focal',
        timespan: '24h',
        maxpoints: 50,
      });
    }
  }

  const spikes = cache.get<EventSpike[]>('bq_event_spikes') ?? [];
  for (const spike of spikes.filter(s => s.spike_ratio > 3)) {
    const country = spike.country;
    if (!staticKeywords.includes(country.toLowerCase())) {
      dynamic.push({
        query: `${country} (crisis OR conflict OR protest OR violence OR military)`,
        category: 'dynamic_spike',
        timespan: '24h',
        maxpoints: 50,
      });
    }
  }

  return dynamic.slice(0, 5);
}

const CATEGORY_PRIORITY: Record<string, number> = {
  conflict: 0, terrorism: 1, crisis: 2,
  africa_crisis: 3, latam_crisis: 3, asia_crisis: 3,
  nuclear: 4, china_threat: 4, russia_ukraine: 5, middle_east: 5,
  us_politics: 6, argentina: 6, energy: 7,
};

const CATEGORY_BULLET: Record<string, NewsBullet> = {
  conflict: 'critical', terrorism: 'critical', crisis: 'high',
  africa_crisis: 'high', latam_crisis: 'high', asia_crisis: 'high',
  nuclear: 'high', china_threat: 'high',
  russia_ukraine: 'medium', middle_east: 'medium',
  us_politics: 'accent', argentina: 'medium', energy: 'accent',
};

function newsToWire(news: NewsPoint[], fetchedAt: number): NewsWireItem[] {
  const hasTone = news.some(n => n.tone !== 0);

  let selected: NewsPoint[];
  if (hasTone) {
    selected = [...news].sort((a, b) => a.tone - b.tone).slice(0, 25);
  } else {
    // Round-robin categories to ensure diversity (max 4 per category)
    const byCategory = new Map<string, NewsPoint[]>();
    for (const n of news) {
      const arr = byCategory.get(n.category) ?? [];
      arr.push(n);
      byCategory.set(n.category, arr);
    }
    const cats = [...byCategory.keys()].sort(
      (a, b) => (CATEGORY_PRIORITY[a] ?? 9) - (CATEGORY_PRIORITY[b] ?? 9)
    );
    selected = [];
    const MAX_PER_CAT = 4;
    for (let round = 0; round < MAX_PER_CAT && selected.length < 25; round++) {
      for (const cat of cats) {
        const items = byCategory.get(cat)!;
        if (round < items.length && selected.length < 25) {
          selected.push(items[round]);
        }
      }
    }
  }

  return selected.map((n, i) => {
    let bullet: NewsBullet;
    if (hasTone) {
      bullet = 'medium';
      if (n.tone < -7) bullet = 'critical';
      else if (n.tone < -4) bullet = 'high';
      else if (n.tone > 0) bullet = 'accent';
    } else {
      bullet = CATEGORY_BULLET[n.category] ?? 'medium';
    }

    const elapsedMin = Math.floor((Date.now() - fetchedAt) / 60_000);
    const time = elapsedMin < 1 ? 'now' : `${elapsedMin}m`;

    return {
      id: `nw-${i}`,
      bullet,
      source: n.source,
      time,
      headline: n.headline,
      tone: n.tone,
      url: n.url,
    };
  });
}

export async function fetchGdeltNews(): Promise<void> {
  const dynamicQueries = await getDynamicQueries();
  const allQueries = [...GDELT_QUERIES, ...dynamicQueries];
  console.log(`[GDELT] Fetching news from ${GDELT_QUERIES.length} static + ${dynamicQueries.length} dynamic queries...`);

  try {
    const results = await Promise.allSettled(
      allQueries.map((q) =>
        withCircuitBreaker(
          'gdelt',
          () => fetchGdeltQuery(q.query, q.category, q.timespan, q.maxpoints),
          () => cache.get<NewsPoint[]>('news') ?? [],
        )
      )
    );

    const allPoints: NewsPoint[] = [];
    results.forEach((r, i) => {
      if (r.status === 'fulfilled') {
        allPoints.push(...r.value);
        console.log(`[GDELT] ${allQueries[i].category}: ${r.value.length} points`);
      } else {
        console.warn(`[GDELT] ${allQueries[i].category} failed:`, r.reason);
      }
    });

    if (allPoints.length > 0) {
      const deduped = deduplicateNews(allPoints);
      const filtered = await filterRelevantNews(deduped);

      // Translate non-English headlines before caching
      await translateHeadlines(filtered);

      // Merge with existing cached events to accumulate over time
      const existing = cache.get<NewsPoint[]>('news') ?? [];
      const newKeys = new Set(filtered.map(p =>
        `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}_${p.headline.substring(0, 40).toLowerCase()}`
      ));
      const kept = existing.filter(p => {
        const key = `${p.lat.toFixed(1)}_${p.lng.toFixed(1)}_${p.headline.substring(0, 40).toLowerCase()}`;
        return !newKeys.has(key); // keep old events not in new batch
      });
      const merged = [...filtered, ...kept];

      // Prune events older than 7 days (keep permanent zones)
      const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const pruned = merged.filter(p => {
        const age = now - new Date(p.fetchedAt).getTime();
        if (age > MAX_AGE_MS) return isInPermanentZone(p.lat, p.lng);
        return true;
      });

      // Cap news points to prevent memory bloat
      const MAX_NEWS_POINTS = 5000;
      if (pruned.length > MAX_NEWS_POINTS) {
        pruned.sort((a, b) => new Date(b.fetchedAt).getTime() - new Date(a.fetchedAt).getTime());
        pruned.length = MAX_NEWS_POINTS;
      }

      const fetchedAtMs = Date.now();
      cache.set('news', pruned, TTL.NEWS);
      console.log(`[GDELT] Total: ${filtered.length} new + ${kept.length} kept = ${pruned.length} after prune`);

      const wire = newsToWire(pruned, fetchedAtMs);
      cache.set('newswire', wire, TTL.NEWS);
    } else {
      console.warn('[GDELT] No data received, keeping cache/mock');
    }
  } catch (err) {
    console.error('[GDELT] Fetch failed:', err);
  }
}
