import RSSParser from 'rss-parser';
import { FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import { stripHTML } from '../utils.js';
import { translateTexts } from './translate.js';
import { aiComplete } from '../utils/ai-client.js';
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

  // ═══ Tier 2 – Argentina ═══
  { url: 'https://www.infobae.com/arc/outboundfeeds/rss/', flag: '🇦🇷', handle: 'Infobae', role: 'Argentine News', sourceName: 'infobae', category: 'leader', tags: ['argentina', 'news'], tier: 2 },
  { url: 'https://www.clarin.com/rss/lo-ultimo/', flag: '🇦🇷', handle: 'Clarín', role: 'Argentine News', sourceName: 'clarin', category: 'leader', tags: ['argentina', 'news'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:24h+site:lanacion.com.ar+politica+OR+economia+OR+gobierno&ceid=AR:es-419&hl=es-419&gl=AR', flag: '🇦🇷', handle: 'La Nación', role: 'Argentine News', sourceName: 'lanacion', category: 'leader', tags: ['argentina', 'news'], tier: 2 },
  { url: 'https://www.ambito.com/rss/pages/home.xml', flag: '🇦🇷', handle: 'Ámbito', role: 'Argentine Finance', sourceName: 'ambito', category: 'leader', tags: ['argentina', 'economy'], tier: 2 },
  { url: 'https://www.cronista.com/files/rss/economia-politica.xml', flag: '🇦🇷', handle: 'El Cronista', role: 'Argentine Finance', sourceName: 'cronista', category: 'leader', tags: ['argentina', 'economy'], tier: 2 },
  { url: 'https://tn.com.ar/rss.xml', flag: '🇦🇷', handle: 'TN', role: 'Argentine News', sourceName: 'tn', category: 'leader', tags: ['argentina', 'news'], tier: 2 },
  { url: 'https://news.google.com/rss/search?q=when:24h+site:pagina12.com.ar&ceid=AR:es-419&hl=es-419&gl=AR', flag: '🇦🇷', handle: 'Página/12', role: 'Argentine News', sourceName: 'pagina12', category: 'leader', tags: ['argentina', 'news'], tier: 2 },

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
  'TruthSocial', 'WhiteHouse', 'Pentagon', 'StateDept', 'NATO', 'IAEA',
  'Kremlin', 'CSIS', 'ISW',
]);

// ── Haiku filter decision cache (headline → keep/reject) ──
const filterCache = new Map<string, boolean>();
const FILTER_CACHE_MAX = 3000;
function filterKey(text: string): string {
  return text.substring(0, 80).toLowerCase().trim();
}

// Headline keywords that indicate irrelevant content for an intel dashboard
// Note: no trailing \b — allows prefix matching (e.g. "olympi" matches "Olympics")
const NOISE_PATTERNS = /\b(olympi|medal\b|athlet|quarterback|touchdown|nfl\b|nba\b|mlb\b|nhl\b|super bowl|world series|slam dunk|home run\b|batting|pitching|soccer goal|premier league|champions league|la liga|serie a\b|bundesliga|tennis\b|golf\b|swimming|gymnast|skating|curling|bobsled|ski jump|snowboard|relay race|marathon run|halfpipe|slalom|biathlon|figure skat|volleyball|rowing\b|fencing\b|wrestling match|boxing ring|ufc\b|mma\b|formula.?1|nascar|grand prix|copa america|world cup|euro 2\d|stanley cup|draft pick|free agent sign|transfer window|recipe|cookbook|cooking\b|baked?\b|chef\b|restaurant review|food recall|dining\b|nutrition tip|kitchen hack|fashion\b|runway\b|designer\b|couture|red carpet|beauty\b|makeup|skincare|hairstyle|fragrance|celebrity|kardashian|hollywood|box office|movie review|tv show|streaming\b|netflix|hulu\b|disney\+|emmy\b|oscar\b|grammy|golden globe|spirit award|billboard\b|album\b|concert\b|tour date|pop star|broadway|reality tv|bachelor\b|bachelorette|survivor\b|big brother|idol\b|talent show|housewives|dating show|wedding plan|baby shower|gender reveal|home renovation|hgtv|diy project|garden tip|pet care|dog breed|cat video|horoscope|zodiac|psychic|lottery|jackpot|casino\b|betting odds|fantasy sport|prop bet|crossword|puzzle\b|trivia\b|viral video|tiktok trend|influencer|yoga\b|pilates|workout|weight loss|diet plan|keto\b|paleo\b|vegan recipe|juice cleanse|hiker die|hiker found|summit.*(peak|mountain)|preacher.*kid|meth addict|kiosk.smash|airport.*rampage|cause.of.death|death.reveal|dies.at|beloved.*dies|gorilla|zoo\b|passes.away|found.dead|obituary|funeral|burial|legendary.actor|soap.opera|puppy|kitten|dog.breed|cat.video|baby.name|gender.reveal|wedding.plan|tattoo|boyfriend|girlfriend|breakup|cheating|plastic.surgery)/i;

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
        url: item.link || undefined,
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
    // Translate non-English feed titles — but preserve Argentine sources in Spanish
    const toTranslate: { idx: number; text: string }[] = [];
    for (let i = 0; i < allItems.length; i++) {
      if (allItems[i].text && !allItems[i].tags.includes('argentina')) {
        toTranslate.push({ idx: i, text: allItems[i].text });
      }
    }
    if (toTranslate.length > 0) {
      const translated = await translateTexts(toTranslate.map(t => t.text), 'FEEDS');
      for (let j = 0; j < toTranslate.length; j++) {
        allItems[toTranslate[j].idx].text = translated[j];
      }
    }

    // AI relevance filter — skip government/institutional sources
    const toFilter: FeedItem[] = [];
    const passThrough: FeedItem[] = [];
    for (const item of allItems) {
      if (UNFILTERED_HANDLES.has(item.handle)) {
        passThrough.push(item);
      } else {
        toFilter.push(item);
      }
    }

    if (toFilter.length > 0) {
      // Split into cached-decision items and truly-new items
      const alreadyDecided: FeedItem[] = [];
      const needsAI: FeedItem[] = [];
      for (const item of toFilter) {
        const key = filterKey(item.text);
        const cached = filterCache.get(key);
        if (cached !== undefined) {
          if (cached) alreadyDecided.push(item);
          // if cached === false, item was rejected → skip
        } else {
          needsAI.push(item);
        }
      }

      const kept: FeedItem[] = [...alreadyDecided];

      if (needsAI.length > 0) {
        const BATCH = 50;
        for (let i = 0; i < needsAI.length; i += BATCH) {
          const batch = needsAI.slice(i, i + BATCH);
          const numbered = batch.map((f, idx) => `${idx}: ${f.text}`).join('\n');
          try {
            const resp = await aiComplete(
              'You are a geopolitical intelligence filter. For each numbered headline, respond with ONLY the numbers of headlines relevant to: geopolitics, international relations, military/defense, politics, economics/markets, trade, diplomacy, cyber/intelligence, terrorism, natural disasters, humanitarian crises, energy/commodities. Exclude: sports, entertainment, celebrity, lifestyle, weather forecasts, cooking, health/wellness tips, obituaries, human interest, local crime, gossip. Return ONLY a JSON array of numbers like [0,2,5].',
              numbered,
              { preferHaiku: true, maxTokens: 200 },
            );
            const indices = new Set(
              JSON.parse(resp.text.match(/\[[\d,\s]*\]/)?.[0] ?? '[]') as number[],
            );
            for (let j = 0; j < batch.length; j++) {
              const key = filterKey(batch[j].text);
              if (indices.has(j)) {
                kept.push(batch[j]);
                filterCache.set(key, true);
              } else {
                filterCache.set(key, false);
              }
            }
          } catch {
            // On error, keep all and don't cache (will retry next cycle)
            kept.push(...batch);
          }
        }
        // Evict oldest entries if cache is too large
        if (filterCache.size > FILTER_CACHE_MAX) {
          const excess = filterCache.size - FILTER_CACHE_MAX;
          const keys = [...filterCache.keys()].slice(0, excess);
          for (const k of keys) filterCache.delete(k);
        }
      }

      console.log(`[FEEDS] Haiku filter: ${toFilter.length} total, ${needsAI.length} new → AI, ${alreadyDecided.length} cached → ${kept.length} kept`);
      allItems.length = 0;
      allItems.push(...passThrough, ...kept);
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
    console.log(`[FEEDS] ${allItems.length} feed items cached`);
  } else {
    console.warn('[FEEDS] No feed items received, keeping cache/mock');
  }
}
