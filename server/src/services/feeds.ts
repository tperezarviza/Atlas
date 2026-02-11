import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import type { FeedItem, FeedCategory } from '../types.js';

const parser = new RSSParser({
  timeout: FETCH_TIMEOUT_RSS,
  headers: {
    'User-Agent': 'ATLAS/1.0 (Geopolitical Dashboard)',
  },
});

interface FeedSource {
  url: string;
  flag: string;
  handle: string;
  role: string;
  sourceName: string;
  category: FeedCategory;
  tags: string[];
}

const FEED_SOURCES: FeedSource[] = [
  // Trump — Truth Social
  {
    url: 'https://www.trumpstruth.org/feed',
    flag: '🇺🇸', handle: '@realDonaldTrump', role: 'President of the United States',
    sourceName: 'Truth Social', category: 'trump', tags: ['POTUS', 'Trump'],
  },
  // US Government
  {
    url: 'https://www.whitehouse.gov/feed/',
    flag: '🇺🇸', handle: 'White House', role: 'Executive Office of the President',
    sourceName: 'White House', category: 'leader', tags: ['White House', 'Executive'],
  },
  {
    url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945',
    flag: '🇺🇸', handle: 'Pentagon Press', role: 'Department of Defense',
    sourceName: 'Pentagon', category: 'military', tags: ['Military', 'DoD'],
  },
  {
    url: 'https://www.state.gov/rss-feeds/press-releases/feed/',
    flag: '🇺🇸', handle: 'State Dept', role: 'Department of State',
    sourceName: 'State Dept', category: 'leader', tags: ['Diplomacy', 'State'],
  },
  // International orgs
  {
    url: 'https://www.nato.int/cps/en/natohq/news.rss',
    flag: '🌐', handle: 'NATO', role: 'North Atlantic Treaty Organization',
    sourceName: 'NATO', category: 'military', tags: ['NATO', 'Defense'],
  },
  {
    url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    flag: '🌐', handle: 'UN News', role: 'United Nations',
    sourceName: 'UN News', category: 'leader', tags: ['UN', 'Diplomacy'],
  },
  {
    url: 'https://www.iaea.org/feeds/topnews',
    flag: '☢️', handle: 'IAEA', role: 'International Atomic Energy Agency',
    sourceName: 'IAEA', category: 'leader', tags: ['Nuclear', 'IAEA'],
  },
  // News wires
  {
    url: 'https://moxie.foxnews.com/google-publisher/latest.xml',
    flag: '🇺🇸', handle: 'Fox News', role: 'News Network',
    sourceName: 'Fox News', category: 'leader', tags: ['News', 'US'],
  },
  {
    url: 'https://feeds.reuters.com/reuters/topNews',
    flag: '🌐', handle: 'Reuters', role: 'News Agency',
    sourceName: 'Reuters', category: 'leader', tags: ['News', 'Wire'],
  },
  {
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    flag: '🇬🇧', handle: 'BBC World', role: 'News Service',
    sourceName: 'BBC World', category: 'leader', tags: ['News', 'World'],
  },
  {
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    flag: '🌐', handle: 'Al Jazeera', role: 'News Network',
    sourceName: 'Al Jazeera', category: 'leader', tags: ['News', 'Middle East'],
  },
  // Regional / Leaders
  {
    url: 'http://en.kremlin.ru/events/president/news.rss',
    flag: '🇷🇺', handle: 'Kremlin Press', role: 'Office of the President',
    sourceName: 'Kremlin', category: 'leader', tags: ['Russia', 'Kremlin'],
  },
  {
    url: 'https://www.gov.uk/government/organisations/prime-ministers-office-10-downing-street.atom',
    flag: '🇬🇧', handle: '10 Downing St', role: 'Prime Minister\'s Office',
    sourceName: '10 Downing St', category: 'leader', tags: ['UK', 'PM'],
  },
  {
    url: 'https://www.aa.com.tr/en/rss/default?cat=world',
    flag: '🇹🇷', handle: 'Anadolu Agency', role: 'News Agency',
    sourceName: 'Anadolu Agency', category: 'leader', tags: ['Turkey', 'News'],
  },
  {
    url: 'http://www.xinhuanet.com/english/rss/worldrss.xml',
    flag: '🇨🇳', handle: 'Xinhua News', role: 'Chinese State Media',
    sourceName: 'Xinhua', category: 'leader', tags: ['China', 'Xinhua'],
  },
];

function relativeTime(dateStr: string | undefined): string {
  if (!dateStr) return '?';
  const date = new Date(dateStr);
  const now = Date.now();
  const diffMin = Math.floor((now - date.getTime()) / 60_000);
  if (diffMin < 1) return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

async function fetchSingleFeed(source: FeedSource): Promise<FeedItem[]> {
  try {
    const feed = await parser.parseURL(source.url);
    return (feed.items ?? []).slice(0, 5).map((item, i) => ({
      id: `rss-${source.handle.replace(/[^a-zA-Z]/g, '')}-${i}`,
      flag: source.flag,
      handle: source.handle,
      role: source.role,
      source: source.sourceName,
      time: relativeTime(item.pubDate ?? item.isoDate),
      category: source.category,
      text: stripHTML(item.title ?? ''),
      engagement: '',
      tags: source.tags,
    }));
  } catch (err) {
    console.warn(`[FEEDS] Failed to fetch ${source.sourceName}:`, err instanceof Error ? err.message : err);
    return [];
  }
}

export async function fetchFeeds(): Promise<void> {
  console.log('[FEEDS] Fetching RSS feeds...');

  const results = await Promise.allSettled(
    FEED_SOURCES.map((source) => fetchSingleFeed(source))
  );

  const allItems: FeedItem[] = [];
  results.forEach((r) => {
    if (r.status === 'fulfilled') {
      allItems.push(...r.value);
    }
  });

  if (allItems.length > 0) {
    // Sort by recency (shortest time string first as heuristic)
    allItems.sort((a, b) => {
      const timeToMin = (t: string): number => {
        if (t === 'now') return 0;
        const num = parseInt(t);
        if (t.endsWith('m')) return num;
        if (t.endsWith('h')) return num * 60;
        if (t.endsWith('d')) return num * 1440;
        return 9999;
      };
      return timeToMin(a.time) - timeToMin(b.time);
    });

    cache.set('feed', allItems, TTL.FEEDS);
    console.log(`[FEEDS] ${allItems.length} feed items cached`);
  } else {
    console.warn('[FEEDS] No feed items received, keeping cache/mock');
  }
}
