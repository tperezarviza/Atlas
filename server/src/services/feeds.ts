import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import { translateTexts } from './translate.js';
import type { FeedItem, FeedCategory } from '../types.js';

const parser = new RSSParser({
  timeout: FETCH_TIMEOUT_RSS,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
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
    url: 'https://www.whitehouse.gov/news/feed/',
    flag: '🇺🇸', handle: 'White House', role: 'Executive Office of the President',
    sourceName: 'White House', category: 'leader', tags: ['White House', 'Executive'],
  },
  {
    url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945',
    flag: '🇺🇸', handle: 'Pentagon Press', role: 'Department of Defense',
    sourceName: 'Pentagon', category: 'military', tags: ['Military', 'DoD'],
  },
  {
    url: 'https://www.state.gov/rss-feed/press-releases/feed/',
    flag: '🇺🇸', handle: 'State Dept', role: 'Department of State',
    sourceName: 'State Dept', category: 'leader', tags: ['Diplomacy', 'State'],
  },
  // International orgs
  {
    url: 'https://news.google.com/rss/search?q=when:24h+site:nato.int&ceid=US:en&hl=en-US&gl=US',
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
    url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US',
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
    url: 'https://news.google.com/rss/search?q=when:24h+site:en.kremlin.ru&ceid=US:en&hl=en-US&gl=US',
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
    sourceName: 'Xinhua', category: 'state_media', tags: ['China', 'Xinhua'],
  },
  // Think tanks
  {
    url: 'https://news.google.com/rss/search?q=when:7d+site:csis.org&ceid=US:en&hl=en-US&gl=US',
    flag: '🏛️', handle: 'CSIS', role: 'Center for Strategic & Intl Studies',
    sourceName: 'CSIS', category: 'think_tank', tags: ['Think Tank', 'Policy'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:7d+site:brookings.edu&ceid=US:en&hl=en-US&gl=US',
    flag: '🏛️', handle: 'Brookings', role: 'Brookings Institution',
    sourceName: 'Brookings', category: 'think_tank', tags: ['Think Tank', 'Policy'],
  },
  {
    url: 'https://www.rand.org/blog.xml',
    flag: '🏛️', handle: 'RAND', role: 'RAND Corporation',
    sourceName: 'RAND', category: 'think_tank', tags: ['Think Tank', 'Defense'],
  },
  {
    url: 'https://www.dailysignal.com/feed/',
    flag: '🏛️', handle: 'Heritage', role: 'Heritage Foundation',
    sourceName: 'Heritage', category: 'think_tank', tags: ['Think Tank', 'Conservative'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:7d+site:understandingwar.org&ceid=US:en&hl=en-US&gl=US',
    flag: '🏛️', handle: 'ISW', role: 'Institute for the Study of War',
    sourceName: 'ISW', category: 'think_tank', tags: ['Think Tank', 'Military'],
  },
  {
    url: 'https://www.atlanticcouncil.org/feed/',
    flag: '🏛️', handle: 'Atlantic Council', role: 'Atlantic Council',
    sourceName: 'Atlantic Council', category: 'think_tank', tags: ['Think Tank', 'NATO'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:7d+site:chathamhouse.org&ceid=US:en&hl=en-US&gl=US',
    flag: '🏛️', handle: 'Chatham House', role: 'Royal Institute of Intl Affairs',
    sourceName: 'Chatham House', category: 'think_tank', tags: ['Think Tank', 'UK'],
  },
  {
    url: 'http://feeds.cfr.org/cfr_main',
    flag: '🏛️', handle: 'CFR', role: 'Council on Foreign Relations',
    sourceName: 'CFR', category: 'think_tank', tags: ['Think Tank', 'Foreign Policy'],
  },
  // Conservative media
  {
    url: 'https://www.dailywire.com/feeds/rss.xml',
    flag: '🇺🇸', handle: 'Daily Wire', role: 'Conservative News',
    sourceName: 'Daily Wire', category: 'conservative', tags: ['Conservative', 'US'],
  },
  {
    url: 'https://feeds.feedburner.com/breitbart',
    flag: '🇺🇸', handle: 'Breitbart', role: 'Conservative News',
    sourceName: 'Breitbart', category: 'conservative', tags: ['Conservative', 'US'],
  },
  {
    url: 'https://feed.theepochtimes.com/us/feed',
    flag: '🇺🇸', handle: 'Epoch Times', role: 'News Outlet',
    sourceName: 'Epoch Times', category: 'conservative', tags: ['Conservative', 'China'],
  },
  {
    url: 'https://nypost.com/feed/',
    flag: '🇺🇸', handle: 'NY Post', role: 'New York Post',
    sourceName: 'NY Post', category: 'conservative', tags: ['Conservative', 'US'],
  },
  {
    url: 'https://www.washingtontimes.com/rss/headlines/news/',
    flag: '🇺🇸', handle: 'Washington Times', role: 'News Daily',
    sourceName: 'Washington Times', category: 'conservative', tags: ['Conservative', 'US'],
  },
  {
    url: 'https://www.nationalreview.com/feed/',
    flag: '🇺🇸', handle: 'National Review', role: 'Conservative Magazine',
    sourceName: 'National Review', category: 'conservative', tags: ['Conservative', 'Policy'],
  },
  // State media
  {
    url: 'https://tass.com/rss/v2.xml',
    flag: '🇷🇺', handle: 'TASS', role: 'Russian State News Agency',
    sourceName: 'TASS', category: 'state_media', tags: ['Russia', 'State Media'],
  },
  {
    url: 'https://www.cgtn.com/subscribe/rss/section/world.xml',
    flag: '🇨🇳', handle: 'CGTN', role: 'Chinese State TV',
    sourceName: 'CGTN', category: 'state_media', tags: ['China', 'State Media'],
  },
  {
    url: 'https://www.presstv.ir/rss.xml',
    flag: '🇮🇷', handle: 'PressTV', role: 'Iranian State TV',
    sourceName: 'PressTV', category: 'state_media', tags: ['Iran', 'State Media'],
  },
  {
    url: 'https://www.globaltimes.cn/rss/outbrain.xml',
    flag: '🇨🇳', handle: 'Global Times', role: 'Chinese State Tabloid',
    sourceName: 'Global Times', category: 'state_media', tags: ['China', 'State Media'],
  },
  {
    url: 'https://sputnikglobe.com/export/rss2/archive/index.xml',
    flag: '🇷🇺', handle: 'Sputnik', role: 'Russian State Media',
    sourceName: 'Sputnik', category: 'state_media', tags: ['Russia', 'State Media'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:24h+site:english.alarabiya.net&ceid=US:en&hl=en-US&gl=US',
    flag: '🇸🇦', handle: 'Al Arabiya', role: 'Saudi-funded News',
    sourceName: 'Al Arabiya', category: 'state_media', tags: ['Saudi Arabia', 'Middle East'],
  },
  {
    url: 'https://www.dailysabah.com/rssFeed/World',
    flag: '🇹🇷', handle: 'Daily Sabah', role: 'Turkish Pro-Government',
    sourceName: 'Daily Sabah', category: 'state_media', tags: ['Turkey', 'State Media'],
  },
  {
    url: 'https://en.irna.ir/rss',
    flag: '🇮🇷', handle: 'IRNA', role: 'Islamic Republic News Agency',
    sourceName: 'IRNA', category: 'state_media', tags: ['Iran', 'State Media'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:24h+site:english.almayadeen.net&ceid=US:en&hl=en-US&gl=US',
    flag: '🇱🇧', handle: 'Al Mayadeen', role: 'Lebanese News Network',
    sourceName: 'Al Mayadeen', category: 'state_media', tags: ['Lebanon', 'Iran-aligned'],
  },
  // Wire services / Major outlets
  {
    url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews',
    flag: '🇺🇸', handle: 'WSJ World', role: 'Wall Street Journal',
    sourceName: 'WSJ', category: 'leader', tags: ['News', 'Finance'],
  },
  {
    url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    flag: '🇺🇸', handle: 'NYT World', role: 'New York Times',
    sourceName: 'NYT', category: 'leader', tags: ['News', 'World'],
  },
  {
    url: 'https://feeds.skynews.com/feeds/rss/world.xml',
    flag: '🇬🇧', handle: 'Sky News', role: 'News Network',
    sourceName: 'Sky News', category: 'leader', tags: ['News', 'UK'],
  },
  {
    url: 'https://rss.dw.com/xml/rss-en-world',
    flag: '🇩🇪', handle: 'DW', role: 'Deutsche Welle',
    sourceName: 'DW', category: 'leader', tags: ['News', 'Germany'],
  },
  {
    url: 'https://www.france24.com/en/rss',
    flag: '🇫🇷', handle: 'France24', role: 'French Intl News',
    sourceName: 'France24', category: 'leader', tags: ['News', 'France'],
  },
  {
    url: 'https://www.timesofisrael.com/feed/',
    flag: '🇮🇱', handle: 'Times of Israel', role: 'Israeli News',
    sourceName: 'Times of Israel', category: 'leader', tags: ['News', 'Israel'],
  },
  {
    url: 'https://news.google.com/rss/search?q=when:24h+site:jpost.com&ceid=US:en&hl=en-US&gl=US',
    flag: '🇮🇱', handle: 'Jerusalem Post', role: 'Israeli Daily',
    sourceName: 'Jerusalem Post', category: 'leader', tags: ['News', 'Israel'],
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
    // Translate non-English feed titles (state media may deliver non-English)
    const nonLatinIndices: number[] = [];
    const nonLatinTexts: string[] = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].text) {
        nonLatinIndices.push(i);
        nonLatinTexts.push(allItems[i].text);
      }
    }
    if (nonLatinTexts.length > 0) {
      const translated = await translateTexts(nonLatinTexts, 'FEEDS');
      for (let j = 0; j < nonLatinIndices.length; j++) {
        allItems[nonLatinIndices[j]].text = translated[j];
      }
    }

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
