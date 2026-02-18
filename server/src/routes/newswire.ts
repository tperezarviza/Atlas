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

export function registerNewswireRoutes(app: FastifyInstance) {
  app.get('/api/newswire', async () => {
    const gdeltWire = cache.get<NewsWireItem[]>('newswire') ?? [];
    const feeds = cache.get<FeedItem[]>('feed') ?? [];

    const rssWire = feedToWire(feeds.filter(f => f.category !== 'trump'));
    const merged = [...gdeltWire, ...rssWire];

    // Sort by time (most recent first: 'now' < '1m' < '5m' < '1h' etc.)
    const timeToMin = (t: string): number => {
      if (t === 'now' || t === 'just now') return 0;
      const num = parseInt(t);
      if (isNaN(num)) return 9999;
      if (t.endsWith('m')) return num;
      if (t.endsWith('h')) return num * 60;
      if (t.endsWith('d')) return num * 1440;
      return 9999;
    };
    merged.sort((a, b) => timeToMin(a.time) - timeToMin(b.time));

    // Deduplicate by first 60 chars of headline
    const seen = new Set<string>();
    const deduped = merged.filter(item => {
      const key = item.headline.substring(0, 60).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return deduped.slice(0, 50);
  });
}
