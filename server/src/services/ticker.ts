import { cache } from '../cache.js';
import { TTL } from '../config.js';
import { aiComplete } from '../utils/ai-client.js';
import type { TickerItem, NewsPoint, FeedItem, MarketSection, EconomicEvent } from '../types.js';
import type { Earthquake } from './earthquakes.js';
import type { PolymarketEvent } from './polymarket.js';

function toneToColor(tone: number): string {
  if (tone < -7) return '#e83b3b'; // critical red
  if (tone < -4) return '#e8842b'; // high orange
  if (tone < -2) return '#d4a72c'; // medium yellow
  if (tone > 2) return '#28b35a';  // positive green
  return '#2d7aed';                // neutral blue
}

const CATEGORY_COLORS: Record<string, string> = {
  terrorism: '#e83b3b',
  russia_ukraine: '#e8842b',
  middle_east: '#e8842b',
  us_politics: '#9b59e8',
  energy: '#d4a72c',
  general: '#2d7aed',
};

const TICKER_MARKETS = ['S&P 500', 'NASDAQ', 'DOW', 'MERVAL', 'BITCOIN', 'GOLD', 'WTI OIL'];
const TICKER_FOREX = ['USD/ARS'];

async function summarizeHeadlines(headlines: string[]): Promise<string[]> {
  if (headlines.length === 0) return [];
  try {
    const response = await aiComplete(
      'Summarize each headline to max 80 characters in English. Keep country names, actors, and action verbs. Return ONLY a JSON array of strings, same order as input.',
      JSON.stringify(headlines),
      { preferHaiku: true, maxTokens: 500 },
    );
    const result = JSON.parse(response.text.match(/\[[\s\S]*\]/)?.[0] ?? '[]');
    return Array.isArray(result) ? result.map(String) : headlines;
  } catch {
    return headlines;
  }
}

export async function composeTicker(): Promise<void> {
  console.log('[TICKER] Compositing ticker from caches...');

  const items: TickerItem[] = [];
  let idCounter = 0;

  // 1. Leader feed items (Trump first)
  const feed = cache.get<FeedItem[]>('feed');
  if (feed) {
    const trumpPosts = feed.filter((f) => f.category === 'trump');
    for (const post of trumpPosts.slice(0, 2)) {
      items.push({
        id: `tk-${idCounter++}`,
        bulletColor: '#9b59e8',
        source: 'TRUTH SOCIAL',
        text: post.text.substring(0, 120),
      });
    }
  }

  // 2. Breaking news — use tone when available, category colors when GDELT returns no tone
  const news = cache.get<NewsPoint[]>('news');
  const headlinesToSummarize: string[] = [];
  const headlineItems: { bulletColor: string; source: string }[] = [];

  if (news) {
    const hasTone = news.some(n => n.tone !== 0);
    let selected: NewsPoint[];
    if (hasTone) {
      selected = [...news].sort((a, b) => a.tone - b.tone).slice(0, 8);
    } else {
      const byCategory = new Map<string, NewsPoint[]>();
      for (const n of news) {
        const arr = byCategory.get(n.category) ?? [];
        arr.push(n);
        byCategory.set(n.category, arr);
      }
      selected = [];
      for (const [, arr] of byCategory) {
        selected.push(...arr.slice(0, 2));
      }
      selected = selected.slice(0, 8);
    }
    for (const n of selected) {
      headlinesToSummarize.push(n.headline);
      headlineItems.push({
        bulletColor: hasTone ? toneToColor(n.tone) : (CATEGORY_COLORS[n.category] ?? '#2d7aed'),
        source: n.source.replace(/\.(com|org|net|gov)$/i, '').toUpperCase(),
      });
    }
  }

  // Add RSS feed headlines
  if (feed) {
    const rssPosts = feed.filter(f => f.category !== 'trump').slice(0, 5);
    for (const post of rssPosts) {
      headlinesToSummarize.push(post.text);
      headlineItems.push({
        bulletColor: '#2d7aed',
        source: post.handle.toUpperCase(),
      });
    }
  }

  // Batch-summarize all headlines
  const summarized = await summarizeHeadlines(headlinesToSummarize);
  for (let i = 0; i < summarized.length; i++) {
    items.push({
      id: `tk-${idCounter++}`,
      bulletColor: headlineItems[i].bulletColor,
      source: headlineItems[i].source,
      text: summarized[i],
    });
  }

  // 3. Key markets (always show these)
  const sections = cache.get<MarketSection[]>('markets');
  if (sections) {
    for (const section of sections) {
      for (const item of section.items) {
        if (TICKER_MARKETS.includes(item.name)) {
          items.push({
            id: `tk-${idCounter++}`,
            bulletColor: item.direction === 'up' ? '#28b35a' : item.direction === 'down' ? '#e83b3b' : '#7a6418',
            source: 'MARKETS',
            text: `${item.name} ${item.price} ${item.delta}`,
          });
        }
      }
    }
  }
  const forex = cache.get<MarketSection[]>('forex');
  if (forex) {
    for (const section of forex) {
      for (const item of section.items) {
        if (TICKER_FOREX.includes(item.name)) {
          items.push({
            id: `tk-${idCounter++}`,
            bulletColor: item.direction === 'up' ? '#28b35a' : item.direction === 'down' ? '#e83b3b' : '#7a6418',
            source: 'FOREX',
            text: `${item.name} ${item.price} ${item.delta}`,
          });
        }
      }
    }
  }

  // 4. Earthquake alerts
  const quakes = cache.get<Earthquake[]>('earthquakes');
  if (quakes) {
    const significant = quakes.filter(q => q.magnitude >= 5.5).slice(0, 3);
    for (const q of significant) {
      items.push({
        id: `tk-${idCounter++}`,
        bulletColor: q.tsunami ? '#e83b3b' : q.magnitude >= 7 ? '#e8842b' : '#d4a72c',
        source: 'USGS',
        text: `M${q.magnitude} ${q.place}${q.tsunami ? ' ⚠ TSUNAMI' : ''}`,
      });
    }
  }

  // 5. Economic calendar — high-impact events in next 24h
  const econEvents = cache.get<EconomicEvent[]>('economic_calendar');
  if (econEvents) {
    const now = Date.now();
    const in24h = now + 24 * 60 * 60 * 1000;
    const highImpact = econEvents.filter(e => {
      if (e.impact !== 'high') return false;
      const eventTime = new Date(`${e.date}T${e.time || '00:00'}:00Z`).getTime();
      return eventTime > now && eventTime < in24h;
    }).slice(0, 3);

    for (const e of highImpact) {
      items.push({
        id: `tk-econ-${idCounter++}`,
        bulletColor: '#d4a72c',
        source: 'ECON',
        text: `${e.currency} ${e.event_name} — ${e.time || 'TBD'}`,
      });
    }
  }

  // 6. Polymarket predictions
  const polymarket = cache.get<PolymarketEvent[]>('polymarket');
  if (polymarket) {
    const top = polymarket.slice(0, 5);
    for (const pm of top) {
      const prob = pm.outcomePrices[0] != null ? Math.round(pm.outcomePrices[0] * 100) : null;
      items.push({
        id: `tk-poly-${idCounter++}`,
        bulletColor: '#a855f7',
        source: 'POLYMARKET',
        text: `${pm.title}${prob != null ? ` — ${prob}%` : ''}`,
      });
    }
  }

  if (items.length > 0) {
    cache.set('ticker', items, TTL.TICKER);
    console.log(`[TICKER] ${items.length} ticker items cached`);
  }
}
