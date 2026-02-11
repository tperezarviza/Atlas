import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { TickerItem, NewsPoint, FeedItem, MarketSection } from '../types.js';

function toneToColor(tone: number): string {
  if (tone < -7) return '#e83b3b'; // critical red
  if (tone < -4) return '#e8842b'; // high orange
  if (tone < -2) return '#d4a72c'; // medium yellow
  if (tone > 2) return '#28b35a';  // positive green
  return '#2d7aed';                // neutral blue
}

export function composeTicker(): void {
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
        bulletColor: '#9b59e8', // purple for Trump
        source: 'TRUTH SOCIAL',
        text: post.text.substring(0, 120),
      });
    }
  }

  // 2. Breaking news (most negative tone)
  const news = cache.get<NewsPoint[]>('news');
  if (news) {
    const critical = [...news].sort((a, b) => a.tone - b.tone).slice(0, 8);
    for (const n of critical) {
      items.push({
        id: `tk-${idCounter++}`,
        bulletColor: toneToColor(n.tone),
        source: n.source.replace(/\.(com|org|net|gov)$/i, '').toUpperCase(),
        text: n.headline,
      });
    }
  }

  // 3. Market movers (items with significant changes)
  const sections = cache.get<MarketSection[]>('markets');
  if (sections) {
    for (const section of sections) {
      for (const item of section.items) {
        const pctMatch = item.delta.match(/([\d.]+)%/);
        const pct = pctMatch ? parseFloat(pctMatch[1]) : 0;
        if (pct >= 1.5) {
          items.push({
            id: `tk-${idCounter++}`,
            bulletColor: item.direction === 'up' ? '#28b35a' : '#e83b3b',
            source: 'MARKETS',
            text: `${item.name} ${item.price} ${item.delta}`,
          });
        }
      }
    }
  }

  if (items.length > 0) {
    cache.set('ticker', items, TTL.TICKER);
    console.log(`[TICKER] ${items.length} ticker items cached`);
  }
}
