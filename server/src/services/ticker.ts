import { cache } from '../cache.js';
import { TTL } from '../config.js';
import type { TickerItem, NewsPoint, FeedItem, MarketSection } from '../types.js';
import type { Earthquake } from './earthquakes.js';

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

  // 2. Breaking news — use tone when available, category colors when GDELT returns no tone
  const news = cache.get<NewsPoint[]>('news');
  if (news) {
    const hasTone = news.some(n => n.tone !== 0);
    let selected: NewsPoint[];
    if (hasTone) {
      selected = [...news].sort((a, b) => a.tone - b.tone).slice(0, 8);
    } else {
      // Round-robin categories for diversity
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
      items.push({
        id: `tk-${idCounter++}`,
        bulletColor: hasTone ? toneToColor(n.tone) : (CATEGORY_COLORS[n.category] ?? '#2d7aed'),
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

  if (items.length > 0) {
    cache.set('ticker', items, TTL.TICKER);
    console.log(`[TICKER] ${items.length} ticker items cached`);
  }
}
