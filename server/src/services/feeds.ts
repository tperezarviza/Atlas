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
  tier: 1 | 2 | 3 | 4;
}

const FEED_SOURCES: FeedSource[] = [
  // ═══ TIER 1: US Government + Conservative (every 3 min) ═══
  { url: 'https://www.trumpstruth.org/feed',
    flag: '🇺🇸', handle: 'TruthSocial', role: 'Trump/Truth Social',
    sourceName: 'Truth Social', category: 'trump', tags: ['POTUS', 'Trump'], tier: 1 },
  { url: 'https://www.whitehouse.gov/news/feed/',
    flag: '🇺🇸', handle: 'WhiteHouse', role: 'White House Official',
    sourceName: 'White House', category: 'leader', tags: ['White House', 'Executive'], tier: 1 },
  { url: 'https://www.defense.gov/DesktopModules/ArticleCS/RSS.ashx?ContentType=1&Site=945',
    flag: '🇺🇸', handle: 'Pentagon', role: 'Department of Defense',
    sourceName: 'Pentagon', category: 'military', tags: ['Military', 'DoD'], tier: 1 },
  { url: 'https://www.state.gov/rss-feed/press-releases/feed/',
    flag: '🇺🇸', handle: 'StateDept', role: 'State Department',
    sourceName: 'State Dept', category: 'leader', tags: ['Diplomacy', 'State'], tier: 1 },
  { url: 'https://moxie.foxnews.com/google-publisher/latest.xml',
    flag: '🇺🇸', handle: 'FoxNews', role: 'Conservative News #1',
    sourceName: 'Fox News', category: 'leader', tags: ['News', 'US'], tier: 1 },
  { url: 'https://www.dailywire.com/feeds/rss.xml',
    flag: '🇺🇸', handle: 'DailyWire', role: 'Conservative Media',
    sourceName: 'Daily Wire', category: 'conservative', tags: ['Conservative', 'US'], tier: 1 },
  { url: 'https://nypost.com/feed/',
    flag: '🇺🇸', handle: 'NYPost', role: 'Conservative Tabloid',
    sourceName: 'NY Post', category: 'conservative', tags: ['Conservative', 'US'], tier: 1 },
  { url: 'https://feeds.feedburner.com/breitbart',
    flag: '🇺🇸', handle: 'Breitbart', role: 'Populist Right',
    sourceName: 'Breitbart', category: 'conservative', tags: ['Conservative', 'US'], tier: 1 },
  { url: 'https://feed.theepochtimes.com/us/feed',
    flag: '🇺🇸', handle: 'EpochTimes', role: 'Anti-CCP Conservative',
    sourceName: 'Epoch Times', category: 'conservative', tags: ['Conservative', 'China'], tier: 1 },

  // ═══ TIER 2: Wire + Allies + Think Tanks ═══
  { url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com&ceid=US:en&hl=en-US&gl=US',
    flag: '🌐', handle: 'Reuters', role: 'Wire Service',
    sourceName: 'Reuters', category: 'leader', tags: ['News', 'Wire'], tier: 2 },
  { url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    flag: '🇬🇧', handle: 'BBC', role: 'British Broadcasting',
    sourceName: 'BBC World', category: 'leader', tags: ['News', 'World'], tier: 2 },
  { url: 'https://feeds.content.dowjones.io/public/rss/RSSWorldNews',
    flag: '🇺🇸', handle: 'WSJ', role: 'Wall Street Journal',
    sourceName: 'WSJ', category: 'leader', tags: ['News', 'Finance'], tier: 2 },
  { url: 'https://feeds.skynews.com/feeds/rss/world.xml',
    flag: '🇬🇧', handle: 'SkyNews', role: 'UK News Network',
    sourceName: 'Sky News', category: 'leader', tags: ['News', 'UK'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:24h+site:nato.int&ceid=US:en&hl=en-US&gl=US',
    flag: '🏳️', handle: 'NATO', role: 'NATO Official',
    sourceName: 'NATO', category: 'military', tags: ['NATO', 'Defense'], tier: 2 },
  { url: 'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    flag: '🇺🇳', handle: 'UN', role: 'United Nations',
    sourceName: 'UN News', category: 'leader', tags: ['UN', 'Diplomacy'], tier: 2 },
  { url: 'https://www.iaea.org/feeds/topnews',
    flag: '⚛️', handle: 'IAEA', role: 'Nuclear Watchdog',
    sourceName: 'IAEA', category: 'leader', tags: ['Nuclear', 'IAEA'], tier: 2 },
  { url: 'https://www.timesofisrael.com/feed/',
    flag: '🇮🇱', handle: 'ToI', role: 'Israeli News',
    sourceName: 'Times of Israel', category: 'leader', tags: ['News', 'Israel'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:24h+site:jpost.com&ceid=US:en&hl=en-US&gl=US',
    flag: '🇮🇱', handle: 'JPost', role: 'Israeli News',
    sourceName: 'Jerusalem Post', category: 'leader', tags: ['News', 'Israel'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:7d+site:csis.org&ceid=US:en&hl=en-US&gl=US',
    flag: '🇺🇸', handle: 'CSIS', role: 'Strategic & Intl Studies',
    sourceName: 'CSIS', category: 'think_tank', tags: ['Think Tank', 'Policy'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:7d+site:understandingwar.org&ceid=US:en&hl=en-US&gl=US',
    flag: '🇺🇸', handle: 'ISW', role: 'Institute for Study of War',
    sourceName: 'ISW', category: 'think_tank', tags: ['Think Tank', 'Military'], tier: 2 },

  // ═══ TIER 3: International Quality ═══
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    flag: '🇺🇸', handle: 'NYT', role: 'New York Times',
    sourceName: 'NYT', category: 'leader', tags: ['News', 'World'], tier: 3 },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml',
    flag: '🇶🇦', handle: 'AlJazeera', role: 'Qatar-based News',
    sourceName: 'Al Jazeera', category: 'leader', tags: ['News', 'Middle East'], tier: 3 },
  { url: 'https://rss.dw.com/xml/rss-en-world',
    flag: '🇩🇪', handle: 'DW', role: 'Deutsche Welle',
    sourceName: 'DW', category: 'leader', tags: ['News', 'Germany'], tier: 3 },
  { url: 'https://www.france24.com/en/rss',
    flag: '🇫🇷', handle: 'France24', role: 'French International',
    sourceName: 'France24', category: 'leader', tags: ['News', 'France'], tier: 3 },

  // ═══ TIER 4: State Media / Propaganda ═══
  { url: 'https://news.google.com/rss/search?q=when:24h+site:en.kremlin.ru&ceid=US:en&hl=en-US&gl=US',
    flag: '🇷🇺', handle: 'Kremlin', role: 'Russian Presidency',
    sourceName: 'Kremlin', category: 'leader', tags: ['Russia', 'Kremlin'], tier: 4 },
  { url: 'https://tass.com/rss/v2.xml',
    flag: '🇷🇺', handle: 'TASS', role: 'Russian State Wire',
    sourceName: 'TASS', category: 'state_media', tags: ['Russia', 'State Media'], tier: 4 },
  { url: 'https://sputnikglobe.com/export/rss2/archive/index.xml',
    flag: '🇷🇺', handle: 'Sputnik', role: 'Russian State Media',
    sourceName: 'Sputnik', category: 'state_media', tags: ['Russia', 'State Media'], tier: 4 },
  { url: 'https://www.aa.com.tr/en/rss/default?cat=world',
    flag: '🇹🇷', handle: 'Anadolu', role: 'Turkish State Agency',
    sourceName: 'Anadolu Agency', category: 'leader', tags: ['Turkey', 'News'], tier: 4 },
  { url: 'http://www.xinhuanet.com/english/rss/worldrss.xml',
    flag: '🇨🇳', handle: 'Xinhua', role: 'Chinese State Agency',
    sourceName: 'Xinhua', category: 'state_media', tags: ['China', 'Xinhua'], tier: 4 },
  { url: 'https://www.cgtn.com/subscribe/rss/section/world.xml',
    flag: '🇨🇳', handle: 'CGTN', role: 'Chinese State TV',
    sourceName: 'CGTN', category: 'state_media', tags: ['China', 'State Media'], tier: 4 },
  { url: 'https://www.globaltimes.cn/rss/outbrain.xml',
    flag: '🇨🇳', handle: 'GlobalTimes', role: 'Chinese State Tabloid',
    sourceName: 'Global Times', category: 'state_media', tags: ['China', 'State Media'], tier: 4 },
  { url: 'https://www.presstv.ir/rss.xml',
    flag: '🇮🇷', handle: 'PressTV', role: 'Iranian State TV',
    sourceName: 'PressTV', category: 'state_media', tags: ['Iran', 'State Media'], tier: 4 },
  { url: 'https://en.irna.ir/rss',
    flag: '🇮🇷', handle: 'IRNA', role: 'Islamic Republic News Agency',
    sourceName: 'IRNA', category: 'state_media', tags: ['Iran', 'State Media'], tier: 4 },
  { url: 'https://news.google.com/rss/search?q=when:24h+site:english.almayadeen.net&ceid=US:en&hl=en-US&gl=US',
    flag: '🇱🇧', handle: 'AlMayadeen', role: 'Resistance Axis Media',
    sourceName: 'Al Mayadeen', category: 'state_media', tags: ['Lebanon', 'Iran-aligned'], tier: 4 },
];

// Sources that bypass relevance filtering (government, institutional, think tanks)
const UNFILTERED_HANDLES = new Set([
  'TruthSocial', 'WhiteHouse', 'Pentagon', 'StateDept', 'NATO', 'UN', 'IAEA',
  'Kremlin', 'CSIS', 'ISW',
]);

// Headline keywords that indicate irrelevant content for an intel dashboard
const NOISE_PATTERNS = /\b(olympi|medal|athlet|quarterback|touchdown|nfl|nba|mlb|nhl|super bowl|world series|playoffs|slam dunk|home run|batting|pitching|soccer goal|premier league|champions league|la liga|serie a|bundesliga|tennis|golf|swimming|gymnast|skating|curling|bobsled|ski|snowboard|sprint|relay race|marathon runner|halfpipe|slalom|biathlon|figure skat|volleyball|rowing|fencing|wrestling match|boxing ring|ufc|mma|formula.?1|nascar|grand prix|copa america|world cup|euro 2|super bowl|playoff|finals game|stanley cup|draft pick|free agent sign|transfer window|recipe|cookbook|cooking|bake|chef|restaurant review|food recall|dining|nutrition tip|kitchen hack|fashion|runway|designer|couture|red carpet|beauty|makeup|skincare|hairstyle|fragrance|celebrity|kardashian|hollywood|box office|movie review|tv show|streaming|netflix|hulu|disney\+|emmy|oscar|grammy|golden globe|spirit award|billboard|album|concert|tour date|pop star|broadway|reality tv|bachelor|bachelorette|survivor|big brother|idol|talent show|housewives|dating show|wedding plan|baby shower|gender reveal|home renovation|hgtv|diy project|garden tip|pet care|dog breed|cat video|horoscope|zodiac|psychic|lottery|jackpot|casino|betting odds|fantasy sport|prop bet|crossword|puzzle|trivia|viral video|tiktok trend|influencer|yoga|pilates|workout|weight loss|diet plan|keto|paleo|vegan recipe|juice cleanse)\b/i;

function isRelevantHeadline(text: string, handle: string): boolean {
  if (UNFILTERED_HANDLES.has(handle)) return true;
  return !NOISE_PATTERNS.test(text);
}

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
    const items: FeedItem[] = [];
    let idx = 0;
    for (const item of (feed.items ?? []).slice(0, 10)) {
      const text = stripHTML(item.title ?? '');
      if (!isRelevantHeadline(text, source.handle)) continue;
      items.push({
        id: `rss-${source.handle.replace(/[^a-zA-Z]/g, '')}-${idx}`,
        flag: source.flag,
        handle: source.handle,
        role: source.role,
        source: source.sourceName,
        time: relativeTime(item.pubDate ?? item.isoDate),
        category: source.category,
        text,
        engagement: '',
        tags: source.tags,
        tier: source.tier,
      });
      idx++;
      if (items.length >= 5) break;
    }
    return items;
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

    // Sort by tier (ascending), then by recency within tier
    allItems.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
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
    const filtered = allItems.filter(i => !UNFILTERED_HANDLES.has(i.handle)).length;
    console.log(`[FEEDS] ${allItems.length} feed items cached (${filtered} from filtered sources)`);
  } else {
    console.warn('[FEEDS] No feed items received, keeping cache/mock');
  }
}
