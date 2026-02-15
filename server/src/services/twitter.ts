import { X_BEARER_TOKEN, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { redisSet } from '../redis.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import type { TwitterIntelItem, TweetCategory, TweetPriority } from '../types.js';

const API_BASE = 'https://api.x.com/2';

// ── Account-based monitoring (no keyword searches) ──

interface AccountGroup {
  label: string;
  accounts: string[];
  category: TweetCategory;
  priority: TweetPriority;
}

const ACCOUNT_GROUPS: AccountGroup[] = [
  // POTUS & Trump
  {
    label: 'POTUS & Trump',
    accounts: ['realDonaldTrump', 'POTUS', 'WhiteHouse'],
    category: 'trump', priority: 'flash',
  },
  // US Intelligence & Defense
  {
    label: 'US Intel & Defense',
    accounts: ['ODNIgov', 'CIA', 'NSAGov', 'FBI', 'DefenseIntel', 'DeptofDefense', 'NGA_GEOINT', 'CISAgov'],
    category: 'military', priority: 'urgent',
  },
  // US Combatant Commands
  {
    label: 'US Commands',
    accounts: ['CENTCOM', 'US_EUCOM', 'INDOPACOM', 'USSOCOM', 'USNorthernCmd', 'US_Stratcom', 'US_CYBERCOM', 'US_SpaceCom', 'nro_gov'],
    category: 'military', priority: 'priority',
  },
  // US Government & Foreign Policy
  {
    label: 'US Gov & Diplomacy',
    accounts: ['StateDept', 'USTreasury', 'USTradeRep', 'DHSgov', 'CBP'],
    category: 'geopolitical', priority: 'priority',
  },
  // US Congress (key committees)
  {
    label: 'US Congress',
    accounts: ['SenateGOP', 'HouseGOP', 'SenForeign', 'HouseForeign', 'SenateBanking'],
    category: 'geopolitical', priority: 'routine',
  },
  // US Key Officials
  {
    label: 'US Officials',
    accounts: ['JDVance', 'SecRubio', 'SecWar', 'TulsiGabbard', 'CIADirector', 'FBIDirectorKash', 'CYBERCOM_DIRNSA', 'KeithKellogg'],
    category: 'geopolitical', priority: 'priority',
  },
  // Israel
  {
    label: 'Israel',
    accounts: ['IsraeliPM', 'Israel_MOD', 'IDF', 'IsraelMFA', 'FaborDIonline'],
    category: 'crisis', priority: 'urgent',
  },
  // Middle East Actors
  {
    label: 'Middle East',
    accounts: ['KSAmofaEN', 'MoFAICUAE', 'ABORAIMFA_EN'],
    category: 'geopolitical', priority: 'priority',
  },
  // UK
  {
    label: 'UK',
    accounts: ['DefenceHQ', 'GCHQ'],
    category: 'military', priority: 'priority',
  },
  // EU & NATO
  {
    label: 'EU & NATO',
    accounts: ['eu_eeas', 'EU_Commission', 'EUDefenceAgency', 'NATO', 'SHAPE_NATO', 'INTERPOL_HQ'],
    category: 'geopolitical', priority: 'priority',
  },
  // Economic / Financial
  {
    label: 'Economic',
    accounts: ['FederalReserve', 'IMFNews', 'WorldBank', 'BIS_org'],
    category: 'geopolitical', priority: 'routine',
  },
];

// Build query strings from account groups (max ~512 chars per query for Basic plan)
function buildQueries(): { query: string; category: TweetCategory; priority: TweetPriority; label: string }[] {
  const MAX_QUERY_LEN = 500;
  const queries: { query: string; category: TweetCategory; priority: TweetPriority; label: string }[] = [];

  for (const group of ACCOUNT_GROUPS) {
    let current: string[] = [];
    let currentLen = 0;

    for (const account of group.accounts) {
      const part = `from:${account}`;
      const addLen = current.length > 0 ? part.length + 4 : part.length; // " OR " = 4

      if (currentLen + addLen > MAX_QUERY_LEN && current.length > 0) {
        queries.push({
          query: current.join(' OR '),
          category: group.category,
          priority: group.priority,
          label: group.label,
        });
        current = [part];
        currentLen = part.length;
      } else {
        current.push(part);
        currentLen += addLen;
      }
    }

    if (current.length > 0) {
      queries.push({
        query: current.join(' OR '),
        category: group.category,
        priority: group.priority,
        label: group.label,
      });
    }
  }

  return queries;
}

const ALL_QUERIES = buildQueries();

// Rate-limit tracking: 10,000 tweets/month read cap
let monthlyTweetsRead = 0;
let currentMonth = new Date().getMonth();
let queryIndex = 0;

export function setMonthlyTweetsRead(count: number): void { monthlyTweetsRead = count; }
export function setQueryIndex(idx: number): void { queryIndex = idx; }

const MONTHLY_CAP = 10_000;
const CAP_WARNING_PCT = 0.9;

function resetMonthlyCounter(): void {
  const now = new Date().getMonth();
  if (now !== currentMonth) {
    monthlyTweetsRead = 0;
    currentMonth = now;
    console.log('[TWITTER] Monthly counter reset');
  }
}

function isOverBudget(): boolean {
  return monthlyTweetsRead >= MONTHLY_CAP * CAP_WARNING_PCT;
}

async function searchTweets(q: { query: string; category: TweetCategory; priority: TweetPriority }, maxResults: number): Promise<TwitterIntelItem[]> {
  const params = new URLSearchParams({
    query: q.query,
    max_results: String(maxResults),
    'tweet.fields': 'created_at,public_metrics,author_id,geo',
    expansions: 'author_id',
    'user.fields': 'username,name,verified,public_metrics',
  });

  const res = await fetch(`${API_BASE}/tweets/search/recent?${params}`, {
    headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
  });

  if (!res.ok) {
    if (res.status === 429) {
      console.warn('[TWITTER] Rate limited, backing off');
      return [];
    }
    throw new Error(`X API ${res.status}`);
  }

  const data = await res.json() as {
    data?: any[];
    includes?: { users?: any[] };
  };

  if (!data.data) return [];

  const users = new Map<string, any>();
  for (const u of data.includes?.users || []) {
    users.set(u.id, u);
  }

  monthlyTweetsRead += data.data.length;

  return data.data
    .map((t: any) => {
      const author = users.get(t.author_id) || {};
      const metrics = t.public_metrics || {};
      return {
        id: t.id,
        text: t.text || '',
        author: {
          username: author.username || '',
          name: author.name || '',
          verified: author.verified || false,
          followers_count: author.public_metrics?.followers_count || 0,
        },
        created_at: t.created_at || '',
        metrics: {
          retweet_count: metrics.retweet_count || 0,
          reply_count: metrics.reply_count || 0,
          like_count: metrics.like_count || 0,
          impression_count: metrics.impression_count || 0,
        },
        category: q.category,
        priority: q.priority,
        query_matched: q.category,
        url: `https://x.com/i/status/${t.id}`,
      } satisfies TwitterIntelItem;
    })
    .filter((t: TwitterIntelItem) => {
      // Filter retweets for trump category
      if (q.category === 'trump' && t.text.startsWith('RT @')) return false;
      // Filter image-only / link-only tweets with no real text
      const textWithoutUrls = t.text.replace(/https?:\/\/\S+/g, '').trim();
      return textWithoutUrls.length >= 10;
    });
}

// Single fetch function — rotates through all account groups
export async function fetchTwitterPrimary(): Promise<void> {
  if (!X_BEARER_TOKEN) return;
  resetMonthlyCounter();
  if (isOverBudget()) {
    console.warn(`[TWITTER] Near monthly cap (${monthlyTweetsRead}/${MONTHLY_CAP}), skipping`);
    return;
  }

  const q = ALL_QUERIES[queryIndex % ALL_QUERIES.length];
  queryIndex++;

  console.log(`[TWITTER] Fetching: ${q.label} (budget: ${monthlyTweetsRead}/${MONTHLY_CAP})`);
  try {
    const newTweets = await withCircuitBreaker(
      'twitter',
      () => searchTweets(q, 10),
      () => [] as TwitterIntelItem[],
    );
    const existing = cache.get<TwitterIntelItem[]>('twitter') || [];
    const seen = new Set(existing.map(t => t.id));
    const merged = [...newTweets.filter(t => !seen.has(t.id)), ...existing]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 200);

    await cache.setWithRedis('twitter', merged, TTL.TWITTER, 3600);
    if (newTweets.length > 0) {
      console.log(`[TWITTER] +${newTweets.length} tweets (total: ${merged.length})`);
    }

    // Persist state to Redis for restart recovery
    await redisSet('state:twitterMonthlyCount', monthlyTweetsRead, 35 * 86400).catch(() => {});
    await redisSet('state:twitterQueryIndex', queryIndex, 35 * 86400).catch(() => {});
  } catch (err) {
    console.error('[TWITTER] Fetch failed:', err instanceof Error ? err.message : err);
  }
}

// Secondary is now the same rotation, just continues the index
export async function fetchTwitterSecondary(): Promise<void> {
  return fetchTwitterPrimary();
}
