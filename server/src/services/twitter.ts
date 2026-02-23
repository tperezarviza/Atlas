import { X_BEARER_TOKEN, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { redisSet } from '../redis.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import type { TwitterIntelItem, TweetCategory, TweetPriority } from '../types.js';

const API_BASE = 'https://api.x.com/2';

// ── Account-based monitoring (no keyword searches) ──

// TIER A — Checked every cycle (most frequent)
// TIER B — Checked every 2nd cycle
// TIER C — Checked every 4th cycle

interface AccountGroup {
  label: string;
  accounts: string[];
  category: TweetCategory;
  priority: TweetPriority;
  tier: 'A' | 'B' | 'C';
}

const ACCOUNT_GROUPS: AccountGroup[] = [
  // ── TIER A: Flash/Urgent — every cycle ──
  {
    label: 'POTUS & Trump',
    accounts: ['realDonaldTrump', 'POTUS'],
    category: 'trump', priority: 'flash', tier: 'A',
  },
  {
    label: 'US Intel & Defense',
    accounts: ['ODNIgov', 'CIA', 'NSAGov', 'FBI', 'DefenseIntel', 'DeptofDefense', 'CISAgov'],
    category: 'military', priority: 'urgent', tier: 'A',
  },
  {
    label: 'Israel',
    accounts: ['IsraeliPM', 'Israel_MOD', 'IDF', 'IsraelMFA', 'FaborDIonline'],
    category: 'crisis', priority: 'urgent', tier: 'A',
  },
  {
    label: 'US Key Officials',
    accounts: ['JDVance', 'SecRubio', 'SecWar', 'TulsiGabbard', 'CIADirector', 'FBIDirectorKash', 'CYBERCOM_DIRNSA', 'KeithKellogg'],
    category: 'geopolitical', priority: 'priority', tier: 'A',
  },

  // ── TIER B: Priority — every 2nd cycle ──
  {
    label: 'US Combatant Commands',
    accounts: ['CENTCOM', 'US_EUCOM', 'INDOPACOM', 'USSOCOM', 'US_Stratcom', 'US_CYBERCOM'],
    category: 'military', priority: 'priority', tier: 'B',
  },
  {
    label: 'US Gov & Diplomacy',
    accounts: ['StateDept', 'USTreasury', 'USTradeRep', 'DHSgov', 'CBP', 'WhiteHouse'],
    category: 'geopolitical', priority: 'priority', tier: 'B',
  },
  {
    label: 'Middle East & Iran',
    accounts: [
      'KSAmofaEN',    // Saudi MFA
      'MoFAICUAE',    // UAE MFA
      'IRIMFA_EN',    // Iran MFA (English)
      'Iran_GOV',     // Iran Government
      'MofaQatar_EN', // Qatar MFA (key mediator)
      'MfaEgypt',     // Egypt MFA Spokesperson
      'MFATurkiye',   // Turkey MFA
    ],
    category: 'geopolitical', priority: 'priority', tier: 'B',
  },
  {
    label: 'UK',
    accounts: ['DefenceHQ', 'GCHQ'],
    category: 'military', priority: 'priority', tier: 'B',
  },
  {
    label: 'EU & NATO',
    accounts: ['eu_eeas', 'NATO', 'SHAPE_NATO'],
    category: 'geopolitical', priority: 'priority', tier: 'B',
  },
  {
    label: 'Argentina',
    accounts: ['JMilei', 'VickyVillarruel', 'PatoBullrich', 'LuisCaputoAR',
               'CFKArgentina', 'SergioMassa', 'JuanGrabworking', 'Abordo'],
    category: 'geopolitical' as TweetCategory,
    priority: 'priority' as TweetPriority,
    tier: 'B' as const,
  },

  // ── TIER C: Routine — every 4th cycle ──
  {
    label: 'US Congress',
    accounts: ['SenateGOP', 'HouseGOP', 'SenForeign', 'HouseForeign'],
    category: 'geopolitical', priority: 'routine', tier: 'C',
  },
  {
    label: 'Economic',
    accounts: ['FederalReserve'],
    category: 'geopolitical', priority: 'routine', tier: 'C',
  },
];

// Build tiered query strings from account groups (max ~512 chars per query for Basic plan)
interface TieredQuery {
  query: string;
  category: TweetCategory;
  priority: TweetPriority;
  label: string;
  tier: 'A' | 'B' | 'C';
}

function buildTieredQueries(): TieredQuery[] {
  const MAX_QUERY_LEN = 500;
  const queries: TieredQuery[] = [];

  for (const group of ACCOUNT_GROUPS) {
    let current: string[] = [];
    let currentLen = 0;

    for (const account of group.accounts) {
      const part = `from:${account}`;
      const addLen = current.length > 0 ? part.length + 4 : part.length; // " OR " = 4

      if (currentLen + addLen > MAX_QUERY_LEN && current.length > 0) {
        queries.push({
          query: current.join(' OR ') + ' -is:reply',
          category: group.category,
          priority: group.priority,
          label: group.label,
          tier: group.tier,
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
        query: current.join(' OR ') + ' -is:reply',
        category: group.category,
        priority: group.priority,
        label: group.label,
        tier: group.tier,
      });
    }
  }

  return queries;
}

const ALL_TIERED_QUERIES = buildTieredQueries();
const TIER_A = ALL_TIERED_QUERIES.filter(q => q.tier === 'A');
const TIER_B = ALL_TIERED_QUERIES.filter(q => q.tier === 'B');
const TIER_C = ALL_TIERED_QUERIES.filter(q => q.tier === 'C');

// Rate-limit tracking: 1M tweets/month read cap (X Pro plan)
let monthlyTweetsRead = 0;
let currentMonth = new Date().getMonth();
let cycleCount = 0;
let tierAIndex = 0;
let tierBIndex = 0;
let tierCIndex = 0;

export function setMonthlyTweetsRead(count: number): void { monthlyTweetsRead = count; }
export function setQueryIndex(idx: number): void { cycleCount = idx; }

const MONTHLY_CAP = 1_000_000;
const CAP_WARNING_PCT = 0.95;

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
      if (q.category === 'trump' && t.text.startsWith('RT @') && !(/^RT @(WhiteHouse|VP|POTUS45)/.test(t.text))) return false;
      // Filter Milei retweets (he RTs excessively)
      if (t.author.username.toLowerCase() === 'jmilei' && t.text.startsWith('RT @')) return false;
      // Filter image-only / link-only tweets with no real text
      const textWithoutUrls = t.text.replace(/https?:\/\/\S+/g, '').trim();
      return textWithoutUrls.length >= 10;
    });
}

// Tiered fetch — Tier A every cycle, Tier B every 2nd, Tier C every 4th
export async function fetchTwitterTiered(): Promise<void> {
  if (!X_BEARER_TOKEN) return;
  resetMonthlyCounter();
  if (isOverBudget()) {
    console.warn(`[TWITTER] Near monthly cap (${monthlyTweetsRead}/${MONTHLY_CAP}), skipping`);
    return;
  }

  const queriesToRun: TieredQuery[] = [];

  // Always run 1 Tier A query
  if (TIER_A.length > 0) {
    queriesToRun.push(TIER_A[tierAIndex % TIER_A.length]);
    tierAIndex++;
  }

  // Every 2nd cycle, also run 1 Tier B
  if (cycleCount % 2 === 0 && TIER_B.length > 0) {
    queriesToRun.push(TIER_B[tierBIndex % TIER_B.length]);
    tierBIndex++;
  }

  // Every 4th cycle, also run 1 Tier C
  if (cycleCount % 4 === 0 && TIER_C.length > 0) {
    queriesToRun.push(TIER_C[tierCIndex % TIER_C.length]);
    tierCIndex++;
  }

  cycleCount++;

  for (const q of queriesToRun) {
    console.log(`[TWITTER] Fetching: ${q.label} [Tier ${q.tier}] (budget: ${monthlyTweetsRead}/${MONTHLY_CAP})`);
    try {
      const newTweets = await withCircuitBreaker(
        'twitter',
        () => searchTweets(q, 25),
        () => [] as TwitterIntelItem[],
      );
      const existing = cache.get<TwitterIntelItem[]>('twitter') || [];
      const seen = new Set(existing.map(t => t.id));
      const merged = [...newTweets.filter(t => !seen.has(t.id)), ...existing]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 300);

      await cache.setWithRedis('twitter', merged, TTL.TWITTER, 3600);
      if (newTweets.length > 0) {
        console.log(`[TWITTER] +${newTweets.length} tweets (total: ${merged.length})`);
      }
    } catch (err) {
      console.error(`[TWITTER] ${q.label} fetch failed:`, err instanceof Error ? err.message : err);
    }
  }

  // Persist state to Redis for restart recovery
  await redisSet('state:twitterMonthlyCount', monthlyTweetsRead, 35 * 86400).catch(() => {});
  await redisSet('state:twitterQueryIndex', cycleCount, 35 * 86400).catch(() => {});
}

// Legacy alias for warmup compatibility
export const fetchTwitterPrimary = fetchTwitterTiered;
