import { cache } from '../cache.js';
import { TTL } from '../config.js';
import { aiComplete } from '../utils/ai-client.js';
import type { TickerItem, NewsPoint, FeedItem, MarketSection, EconomicEvent, TwitterIntelItem } from '../types.js';
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
  argentina: '#2d7aed',
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

/** Select RSS headlines with round-robin by tier for diversity */
function selectDiverseFeeds(feed: FeedItem[], max: number): FeedItem[] {
  const nonTrump = feed.filter(f => f.category !== 'trump');
  const byTier = new Map<number, FeedItem[]>();
  for (const f of nonTrump) {
    const arr = byTier.get(f.tier) ?? [];
    arr.push(f);
    byTier.set(f.tier, arr);
  }

  // Target distribution: tier 1 → 2, tier 2 → 3 (includes AR), tier 3 → 2, tier 4 → 1
  const targets: [number, number][] = [[1, 2], [2, 3], [3, 2], [4, 1]];
  const selected: FeedItem[] = [];

  for (const [tier, count] of targets) {
    const items = byTier.get(tier) ?? [];
    selected.push(...items.slice(0, count));
  }

  // Fill remaining slots round-robin
  if (selected.length < max) {
    const selectedIds = new Set(selected.map(s => s.id));
    const remaining = nonTrump.filter(f => !selectedIds.has(f.id));
    for (const f of remaining) {
      if (selected.length >= max) break;
      selected.push(f);
    }
  }

  return selected.slice(0, max);
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
      const text = post.text.substring(0, 120).trim();
      if (text.length < 20 || /^\[?no.title\]?/i.test(text) || /^post from/i.test(text)) continue;
      items.push({
        id: `tk-${idCounter++}`,
        bulletColor: '#9b59e8',
        source: 'TRUTH SOCIAL',
        text,
      });
    }
  }

  // 2. Breaking news — 12 items: top 4 negative + 8 round-robin by category
  const news = cache.get<NewsPoint[]>('news');
  const headlinesToSummarize: string[] = [];
  const headlineItems: { bulletColor: string; source: string }[] = [];

  if (news) {
    const hasTone = news.some(n => n.tone !== 0);
    let selected: NewsPoint[];
    if (hasTone) {
      const byTone = [...news].sort((a, b) => a.tone - b.tone);
      const topNeg = byTone.slice(0, 4);
      const topNegIds = new Set(topNeg.map(n => n.id));
      const byCategory = new Map<string, NewsPoint[]>();
      for (const n of news) {
        if (topNegIds.has(n.id)) continue;
        const arr = byCategory.get(n.category) ?? [];
        arr.push(n);
        byCategory.set(n.category, arr);
      }
      const diverse: NewsPoint[] = [];
      const catKeys = [...byCategory.keys()];
      let round = 0;
      while (diverse.length < 8 && round < 4) {
        for (const cat of catKeys) {
          const arr = byCategory.get(cat)!;
          if (round < arr.length && diverse.length < 8) {
            diverse.push(arr[round]);
          }
        }
        round++;
      }
      selected = [...topNeg, ...diverse];
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
      selected = selected.slice(0, 12);
    }
    for (const n of selected) {
      headlinesToSummarize.push(n.headline);
      headlineItems.push({
        bulletColor: hasTone ? toneToColor(n.tone) : (CATEGORY_COLORS[n.category] ?? '#2d7aed'),
        source: n.source.replace(/\.(com|org|net|gov)$/i, '').toUpperCase(),
      });
    }
  }

  // 3. RSS feed headlines — 10 items with tier diversity
  if (feed) {
    const rssPosts = selectDiverseFeeds(feed, 10);
    for (const post of rssPosts) {
      headlinesToSummarize.push(post.text);
      headlineItems.push({
        bulletColor: '#2d7aed',
        source: post.handle.toUpperCase(),
      });
    }
  }

  // 4. Twitter highlights — top 3 flash/urgent tweets
  const tweets = cache.get<TwitterIntelItem[]>('twitter');
  if (tweets) {
    const urgent = tweets.filter(t => t.priority === 'flash' || t.priority === 'urgent').slice(0, 3);
    for (const t of urgent) {
      headlinesToSummarize.push(t.text);
      headlineItems.push({
        bulletColor: t.priority === 'flash' ? '#e83b3b' : '#e8842b',
        source: `@${t.author.username}`.toUpperCase(),
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

  // 5. Key markets (always show these)
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

  // 6. Earthquake alerts
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

  // 7. Economic calendar — high-impact events in next 24h
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

  // 8. Polymarket predictions
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
