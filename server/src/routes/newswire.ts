import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { NewsWireItem, FeedItem, NewsBullet } from '../types.js';

const TIER_BULLET: Record<number, NewsBullet> = { 1: 'high', 2: 'medium', 3: 'accent', 4: 'accent' };

function feedToWire(items: FeedItem[]): NewsWireItem[] {
  return items.map((item, i) => ({
    id: `rss-wire-${i}`,
    bullet: TIER_BULLET[item.tier] ?? 'accent',
    source: item.handle,
    time: item.time,
    headline: item.text,
    tone: 0,
    url: item.url,
  }));
}

const timeToMin = (t: string): number => {
  if (t === 'now' || t === 'just now') return 0;
  const num = parseInt(t);
  if (isNaN(num)) return 9999;
  if (t.endsWith('m')) return num;
  if (t.endsWith('h')) return num * 60;
  if (t.endsWith('d')) return num * 1440;
  return 9999;
};

function dedup(items: NewsWireItem[]): NewsWireItem[] {
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.headline.substring(0, 60).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function registerNewswireRoutes(app: FastifyInstance) {
  app.get('/api/newswire', async () => {
    const gdeltWire = cache.get<NewsWireItem[]>('newswire') ?? [];
    const feeds = cache.get<FeedItem[]>('feed') ?? [];
    const xNews = cache.get<NewsWireItem[]>('x_news') ?? [];

    const rssWire = feedToWire(feeds.filter(f => f.category !== 'trump'));

    // Reserve up to 10 slots for X News (they have older timestamps)
    const xDeduped = dedup([...xNews].sort((a, b) => timeToMin(a.time) - timeToMin(b.time))).slice(0, 10);

    // Fill remaining slots with GDELT + RSS
    const rest = [...gdeltWire, ...rssWire];
    rest.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
    const restDeduped = dedup(rest);

    // Merge: interleave X News among the rest
    const xHeadlines = new Set(xDeduped.map(x => x.headline.substring(0, 60).toLowerCase()));
    const restFiltered = restDeduped.filter(item => {
      const key = item.headline.substring(0, 60).toLowerCase();
      return !xHeadlines.has(key);
    });

    const merged = [...restFiltered.slice(0, 40), ...xDeduped];
    merged.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

    return merged.slice(0, 50);
  });
}
