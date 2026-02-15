import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY, TTL } from '../config.js';
import { cache } from '../cache.js';
import type {
  BriefResponse, Conflict, NewsPoint, FeedItem, MarketSection,
  TwitterIntelItem, Alert, ExecutiveOrder, CongressBill, SenateNomination,
  BorderStat, MacroItem, EconomicEvent, CyberThreatPulse, PropagandaEntry,
  HostilityPair, InternetIncident, ArmedGroup, UkraineFrontData,
  NaturalEvent,
} from '../types.js';
import type { Earthquake } from './earthquakes.js';

// ── Keyword filters for regional data selection ──

const ME_KW = /\b(israel|palestine|gaza|iran|iraq|syria|lebanon|yemen|houthi|saudi|gulf|turkey|egypt|jordan|hezbollah|hamas|tehran|baghdad|damascus|beirut|riyadh|qatar|bahrain|oman|kuwait|red sea|hormuz|bab.el.mandeb|sinai|idf|irgc|netanyahu)\b/i;
const UA_KW = /\b(ukrain|russia|kyiv|moscow|donetsk|zaporizhzhi|kherson|crimea|kursk|nato|zelensk|putin|kremlin|donbas|luhansk|mariupol|bakhmut|avdiivka|black sea|wagner|patriot|himars|f.16|storm shadow)\b/i;
const DOMESTIC_KW = /\b(congress|senate|house|executive order|border|immigra|tariff|trade war|fed |federal reserve|inflation|gdp|unemploy|doge|supreme court|trump|white house|biden|treasury|sec |ftc |fbi |doj |irs |epa )\b/i;

function filterByKeyword<T>(items: T[], kw: RegExp, getText: (item: T) => string): T[] {
  return items.filter(item => kw.test(getText(item)));
}

// ── System prompts per focus ──

const SYSTEM_PROMPTS: Record<string, string> = {
  global: `You are ATLAS, a senior all-source intelligence analyst producing a global situation report for a US national security decision-maker.

PRIORITIES: Global stability, US national security interests, great power competition (China, Russia, Iran), non-state actor threats, nuclear proliferation, market-moving geopolitical events.

RULES:
- Write in English only
- Be direct, factual, no hedging
- Lead with the most critical developments
- Connect geopolitical events to market implications
- Flag anything requiring immediate attention with "FLASH:" prefix

FORMAT (use HTML tags):
<h2>■ SITUATION OVERVIEW</h2>
<p>2-3 sentences: global threat level, dominant narrative of the cycle</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Top 5-8 developments from the last 12-24 hours, ordered by severity</li></ul>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> Imminent threats requiring action</p>
<p><strong>ELEVATED:</strong> Significant concerns to monitor closely</p>
<p><strong>WATCH:</strong> Emerging situations</p>
<h2>■ MARKET IMPLICATIONS</h2>
<p>How today's geopolitics affect global markets: equities, commodities, crypto, forex</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>What to expect next across all theaters</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>Specific indicators, tripwires, and sources to track</li></ul>`,

  mideast: `You are ATLAS MIDEAST DESK, a senior analyst specializing in Middle East and North Africa intelligence for a US national security decision-maker.

FOCUS AREAS: Israel-Palestine conflict, Iran nuclear program & proxy network (Hezbollah, Houthis, Iraqi PMF), Red Sea/Bab el-Mandeb shipping security, Gulf state dynamics (Saudi-Iran detente, UAE), Turkey-region relations, Syria post-civil war, Iraq stability, ISIS remnants, Jordan-Egypt stability.

RULES:
- Write in English only
- Be direct, factual, no hedging
- Prioritize threats to US forces, allies (Israel, Gulf states), and energy flows
- Note Iranian influence operations and proxy escalation
- Track Houthi attacks on commercial shipping with dates and vessel names when available
- Flag nuclear program developments as CRITICAL

FORMAT (use HTML tags):
<h2>■ REGIONAL OVERVIEW</h2>
<p>2-3 sentences: overall threat level in theater, dominant narrative</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Top developments ordered by severity — only Middle East</li></ul>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> items</p>
<p><strong>ELEVATED:</strong> items</p>
<p><strong>WATCH:</strong> items</p>
<h2>■ IRAN TRACKER</h2>
<p>Nuclear program status, proxy activity, sanctions evasion, diplomatic moves</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>Expected developments in theater</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>Sources and indicators to track</li></ul>`,

  ukraine: `You are ATLAS UKRAINE DESK, a senior military-political analyst tracking the Russia-Ukraine conflict for a US national security decision-maker.

FOCUS AREAS: Front-line military operations (Donetsk, Zaporizhzhia, Kherson, Kursk), Russian force generation & mobilization, Ukrainian counter-offensive capabilities, Western arms deliveries and effectiveness, NATO posture changes, sanctions impact on Russian economy, nuclear escalation risk, Black Sea/grain corridor, peace negotiation signals, drone/EW warfare evolution.

RULES:
- Write in English only
- Be direct, use military terminology where appropriate
- Note specific front-line changes with geographic references
- Track weapons systems mentioned (HIMARS, Patriot, F-16, Storm Shadow, etc.)
- Flag any nuclear signaling as CRITICAL
- Note Russian propaganda narratives versus ground truth

FORMAT (use HTML tags):
<h2>■ THEATER OVERVIEW</h2>
<p>2-3 sentences: front-line status, overall trajectory</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Military operations, arms deliveries, political decisions</li></ul>
<h2>■ FRONT-LINE STATUS</h2>
<p>Key axes: Donetsk, Zaporizhzhia, Kherson, Kursk. Gains/losses.</p>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> items</p>
<p><strong>ELEVATED:</strong> items</p>
<p><strong>WATCH:</strong> items</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>Expected operational developments</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>ISW reports, satellite imagery, force movements to track</li></ul>`,

  domestic: `You are ATLAS DOMESTIC DESK, a senior political-economic analyst tracking US internal affairs for a decision-maker interested in policy, markets, and governance.

FOCUS AREAS: Executive orders and presidential actions, Congressional legislation (defense, immigration, trade, intelligence), Supreme Court decisions, border security metrics, economic indicators (GDP, CPI, unemployment, Fed policy), trade policy and tariffs, DOGE government efficiency initiatives, cabinet nominations, key appointments.

RULES:
- Write in English only
- Be direct, factual, policy-focused
- Lead with executive actions and their market impact
- Track Congressional voting patterns on key bills
- Note economic data releases and market reactions
- Flag policy changes affecting defense or intelligence budgets

FORMAT (use HTML tags):
<h2>■ DOMESTIC OVERVIEW</h2>
<p>2-3 sentences: political climate, dominant policy narrative</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Executive orders, legislation, economic data releases</li></ul>
<h2>■ EXECUTIVE ACTIONS</h2>
<p>Recent orders, memoranda, policy directives and their implications</p>
<h2>■ ECONOMIC PULSE</h2>
<p>Key indicators, market reactions, Fed signals, trade developments</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>Upcoming votes, data releases, policy announcements</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>Bills, nominees, indicators to watch</li></ul>`,

  intel: `You are ATLAS INTEL DESK, a senior intelligence community analyst producing a signals and threats digest for a US national security decision-maker.

FOCUS AREAS: Cyber threats and APT campaigns, state media propaganda and disinformation, bilateral hostility indices, internet censorship and shutdowns, military flight activity patterns, armed non-state actor movements, nuclear proliferation indicators, espionage developments, sanctions enforcement, diplomatic calendar events.

RULES:
- Write in English only
- Be direct, use intelligence community terminology (SIGINT, OSINT, HUMINT, APT, IOC)
- Prioritize active cyber campaigns targeting US/allied infrastructure
- Track propaganda narrative shifts across Russia, China, Iran, Turkey
- Note internet shutdowns as potential indicators of impending operations
- Flag unusual military flight patterns
- Cross-reference armed group activity with state sponsor patterns

FORMAT (use HTML tags):
<h2>■ INTELLIGENCE OVERVIEW</h2>
<p>2-3 sentences: information environment, active threat campaigns</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Cyber attacks, disinformation campaigns, intelligence community alerts</li></ul>
<h2>■ CYBER THREAT LANDSCAPE</h2>
<p>Active APT campaigns, targeted countries, malware families, IOC summary</p>
<h2>■ INFORMATION WARFARE</h2>
<p>State media narrative analysis: what Russia, China, Iran, Turkey are pushing and why</p>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> items</p>
<p><strong>ELEVATED:</strong> items</p>
<p><strong>WATCH:</strong> items</p>
<h2>■ RECOMMENDED MONITORING</h2>
<ul><li>IOCs, propaganda shifts, military movements to track</li></ul>`,
};

// ── Data gathering per focus ──

function gatherGlobalData(): string {
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const markets = cache.get<MarketSection[]>('markets') ?? [];
  const quakes = cache.get<Earthquake[]>('earthquakes') ?? [];
  const natEvents = cache.get<NaturalEvent[]>('natural_events') ?? [];
  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const alerts = cache.get<Alert[]>('alerts') ?? [];

  const topNews = [...news].sort((a, b) => a.tone - b.tone).slice(0, 15);
  const sigQuakes = quakes.filter(q => q.magnitude >= 5.5).slice(0, 5);
  const severeNat = natEvents.filter(e => e.severity === 'extreme' || e.severity === 'severe').slice(0, 5);
  const urgentTweets = tweets.filter(t => t.priority === 'flash' || t.priority === 'urgent').slice(0, 8);
  const flashAlerts = alerts.filter(a => a.priority === 'flash' || a.priority === 'urgent').slice(0, 8);

  return `CONFLICTS: ${JSON.stringify(conflicts.slice(0, 10).map(c => ({ name: c.name, severity: c.severity, region: c.region, trend: c.trend, casualties: c.casualties })))}

TOP NEWS (most negative tone): ${JSON.stringify(topNews.map(n => ({ headline: n.headline, tone: n.tone, source: n.source })))}

LEADER STATEMENTS: ${JSON.stringify(feed.slice(0, 8).map(f => ({ handle: f.handle, text: f.text.substring(0, 150), category: f.category })))}

MARKETS: ${JSON.stringify(markets.map(s => ({ title: s.title, items: s.items.map(i => ({ name: i.name, price: i.price, delta: i.delta })) })))}

SIGNIFICANT EARTHQUAKES: ${JSON.stringify(sigQuakes.map(q => ({ magnitude: q.magnitude, place: q.place, tsunami: q.tsunami })))}

SEVERE NATURAL EVENTS: ${JSON.stringify(severeNat.map(e => ({ title: e.title, category: e.category, severity: e.severity })))}

URGENT TWEETS: ${JSON.stringify(urgentTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username, category: t.category })))}

ACTIVE ALERTS: ${JSON.stringify(flashAlerts.map(a => ({ title: a.title, priority: a.priority, source: a.source })))}

Current UTC: ${new Date().toISOString()}`;
}

function gatherMideastData(): string {
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const hostility = cache.get<HostilityPair[]>('hostility') ?? [];
  const propaganda = cache.get<PropagandaEntry[]>('propaganda') ?? [];

  const meConflicts = conflicts.filter(c => ME_KW.test(c.name) || ME_KW.test(c.region));
  const meNews = filterByKeyword([...news].sort((a, b) => a.tone - b.tone), ME_KW, n => n.headline).slice(0, 15);
  const meFeed = filterByKeyword(feed, ME_KW, f => f.text).slice(0, 8);
  const meTweets = tweets.filter(t => (t.category === 'crisis' || t.category === 'military') && ME_KW.test(t.text)).slice(0, 8);
  const meHostility = hostility.filter(h => ME_KW.test(h.countryA) || ME_KW.test(h.countryB)).slice(0, 5);
  const mePropaganda = propaganda.filter(p => p.countryCode === 'IR' || p.countryCode === 'TR');

  return `MIDDLE EAST CONFLICTS: ${JSON.stringify(meConflicts.map(c => ({ name: c.name, severity: c.severity, trend: c.trend, casualties: c.casualties })))}

REGIONAL NEWS: ${JSON.stringify(meNews.map(n => ({ headline: n.headline, tone: n.tone, source: n.source })))}

LEADER STATEMENTS: ${JSON.stringify(meFeed.map(f => ({ handle: f.handle, text: f.text.substring(0, 150), category: f.category })))}

INTELLIGENCE TWEETS: ${JSON.stringify(meTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username })))}

HOSTILITY INDICES: ${JSON.stringify(meHostility.map(h => ({ countryA: h.countryA, countryB: h.countryB, avgTone: h.avgTone, trend: h.trend })))}

STATE MEDIA NARRATIVES (Iran, Turkey): ${JSON.stringify(mePropaganda.map(p => ({ country: p.country, narratives: p.narratives, headlines: p.sampleHeadlines.slice(0, 3) })))}

Current UTC: ${new Date().toISOString()}`;
}

function gatherUkraineData(): string {
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const front = cache.get<UkraineFrontData>('ukraine_front');
  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const hostility = cache.get<HostilityPair[]>('hostility') ?? [];
  const propaganda = cache.get<PropagandaEntry[]>('propaganda') ?? [];

  const uaConflicts = conflicts.filter(c => UA_KW.test(c.name) || UA_KW.test(c.region));
  const uaNews = filterByKeyword([...news].sort((a, b) => a.tone - b.tone), UA_KW, n => n.headline).slice(0, 15);
  const uaFeed = filterByKeyword(feed, UA_KW, f => f.text).slice(0, 8);
  const uaTweets = tweets.filter(t => t.category === 'military' && UA_KW.test(t.text)).slice(0, 8);
  const uaHostility = hostility.filter(h => UA_KW.test(h.countryA) || UA_KW.test(h.countryB)).slice(0, 5);
  const ruPropaganda = propaganda.filter(p => p.countryCode === 'RU');

  const frontData = front ? {
    assessment: front.isw_assessment_text?.substring(0, 500),
    territory: front.territory_summary?.substring(0, 300),
    recentEvents: front.recent_events?.slice(0, 5),
  } : null;

  return `UKRAINE THEATER CONFLICTS: ${JSON.stringify(uaConflicts.map(c => ({ name: c.name, severity: c.severity, trend: c.trend, casualties: c.casualties })))}

FRONT-LINE INTELLIGENCE: ${JSON.stringify(frontData)}

REGIONAL NEWS: ${JSON.stringify(uaNews.map(n => ({ headline: n.headline, tone: n.tone, source: n.source })))}

LEADER STATEMENTS: ${JSON.stringify(uaFeed.map(f => ({ handle: f.handle, text: f.text.substring(0, 150), category: f.category })))}

MILITARY TWEETS: ${JSON.stringify(uaTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username })))}

HOSTILITY INDICES: ${JSON.stringify(uaHostility.map(h => ({ countryA: h.countryA, countryB: h.countryB, avgTone: h.avgTone, trend: h.trend })))}

RUSSIAN STATE MEDIA NARRATIVES: ${JSON.stringify(ruPropaganda.map(p => ({ narratives: p.narratives, headlines: p.sampleHeadlines.slice(0, 3) })))}

Current UTC: ${new Date().toISOString()}`;
}

function gatherDomesticData(): string {
  const orders = cache.get<ExecutiveOrder[]>('executive_orders') ?? [];
  const bills = cache.get<CongressBill[]>('congress_bills') ?? [];
  const noms = cache.get<SenateNomination[]>('congress_nominations') ?? [];
  const border = cache.get<BorderStat[]>('border') ?? [];
  const macro = cache.get<MacroItem[]>('macro') ?? [];
  const markets = cache.get<MarketSection[]>('markets') ?? [];
  const econ = cache.get<EconomicEvent[]>('economic_calendar') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];

  const trumpFeed = feed.filter(f => f.category === 'trump' || f.category === 'musk' || f.category === 'conservative').slice(0, 8);
  const highImpactEcon = econ.filter(e => e.impact === 'high').slice(0, 8);

  return `EXECUTIVE ORDERS: ${JSON.stringify(orders.slice(0, 10).map(o => ({ number: o.number, title: o.title, signing_date: o.signing_date, topics: o.topics, status: o.status })))}

CONGRESS BILLS: ${JSON.stringify(bills.slice(0, 10).map(b => ({ number: b.number, title: b.title, status: b.status, relevance: b.relevance, latest_action: b.latest_action })))}

NOMINATIONS: ${JSON.stringify(noms.slice(0, 8).map(n => ({ name: n.name, position: n.position, status: n.status })))}

BORDER STATS: ${JSON.stringify(border)}

ECONOMIC INDICATORS: ${JSON.stringify(macro)}

MARKETS: ${JSON.stringify(markets.map(s => ({ title: s.title, items: s.items.map(i => ({ name: i.name, price: i.price, delta: i.delta })) })))}

HIGH-IMPACT ECONOMIC EVENTS: ${JSON.stringify(highImpactEcon.map(e => ({ event_name: e.event_name, date: e.date, actual: e.actual, forecast: e.forecast, previous: e.previous })))}

POLITICAL STATEMENTS: ${JSON.stringify(trumpFeed.map(f => ({ handle: f.handle, text: f.text.substring(0, 150), category: f.category })))}

Current UTC: ${new Date().toISOString()}`;
}

function gatherIntelData(): string {
  const cyber = cache.get<CyberThreatPulse[]>('cyber_threats') ?? [];
  const propaganda = cache.get<PropagandaEntry[]>('propaganda') ?? [];
  const hostility = cache.get<HostilityPair[]>('hostility') ?? [];
  const ooni = cache.get<InternetIncident[]>('ooni') ?? [];
  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const groups = cache.get<ArmedGroup[]>('armed_groups') ?? [];
  const alerts = cache.get<Alert[]>('alerts') ?? [];

  const criticalCyber = cyber.filter(c => c.severity === 'critical' || c.severity === 'high').slice(0, 8);
  const activeShutdowns = ooni.filter(i => !i.endDate).slice(0, 8);
  const intelTweets = tweets.filter(t => t.category === 'military' || t.category === 'crisis' || t.category === 'osint').slice(0, 8);
  const recentAlerts = alerts.filter(a => a.priority === 'flash' || a.priority === 'urgent').slice(0, 8);

  return `CYBER THREATS: ${JSON.stringify(criticalCyber.map(c => ({ name: c.name, description: c.description.substring(0, 150), adversary: c.adversary, targeted_countries: c.targeted_countries, severity: c.severity, malware_families: c.malware_families })))}

STATE MEDIA PROPAGANDA: ${JSON.stringify(propaganda.map(p => ({ country: p.country, outlet: p.outlet, narratives: p.narratives, headlines: p.sampleHeadlines.slice(0, 3) })))}

HOSTILITY INDEX: ${JSON.stringify(hostility.slice(0, 10).map(h => ({ countryA: h.countryA, countryB: h.countryB, avgTone: h.avgTone, articleCount: h.articleCount, trend: h.trend })))}

INTERNET SHUTDOWNS: ${JSON.stringify(activeShutdowns.map(i => ({ country: i.country, title: i.title, eventType: i.eventType })))}

OSINT TWEETS: ${JSON.stringify(intelTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username, category: t.category })))}

ARMED NON-STATE ACTORS: ${JSON.stringify(groups.slice(0, 10).map(g => ({ name: g.name, type: g.type, regions: g.regions, estimatedStrength: g.estimatedStrength, recentEvents: g.recentEvents })))}

ACTIVE ALERTS: ${JSON.stringify(recentAlerts.map(a => ({ title: a.title, priority: a.priority, source: a.source })))}

Current UTC: ${new Date().toISOString()}`;
}

const DATA_GATHERERS: Record<string, () => string> = {
  global: gatherGlobalData,
  mideast: gatherMideastData,
  ukraine: gatherUkraineData,
  domestic: gatherDomesticData,
  intel: gatherIntelData,
};

const SOURCE_LABELS: Record<string, string[]> = {
  global: ['ACLED', 'GDELT', 'Markets', 'USGS', 'EONET', 'X/Twitter', 'Alerts'],
  mideast: ['ACLED', 'GDELT', 'X/Twitter', 'Hostility Index', 'Propaganda Monitor'],
  ukraine: ['ACLED', 'GDELT', 'ISW', 'X/Twitter', 'Hostility Index', 'RU Propaganda'],
  domestic: ['Executive Orders', 'Congress', 'Border Stats', 'Macro', 'Markets', 'Econ Calendar'],
  intel: ['Cyber OTX', 'Propaganda Monitor', 'Hostility Index', 'OONI', 'X/Twitter', 'Armed Groups'],
};

// ── HTML sanitizer ──

const ALLOWED_HTML_TAGS = new Set(['h1','h2','h3','h4','p','ul','ol','li','b','strong','em','i','br','span']);

function sanitizeServerHtml(raw: string): string {
  return raw.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(\s*\/?)>/gi, (_match, slash, tag, attrs, selfClose) => {
    const tagLower = tag.toLowerCase();
    if (!ALLOWED_HTML_TAGS.has(tagLower)) return '';
    if (slash) return `</${tagLower}>`;
    const classMatch = (attrs as string).match(/\bclass\s*=\s*"([^"]*)"/i);
    const classAttr = classMatch ? ` class="${classMatch[1].replace(/[^a-zA-Z0-9_ -]/g, '')}"` : '';
    return `<${tagLower}${classAttr}${selfClose}>`;
  });
}

// ── Public API ──

export async function fetchBrief(focus?: string): Promise<BriefResponse> {
  if (!ANTHROPIC_API_KEY) {
    console.warn('[AI-BRIEF] No ANTHROPIC_API_KEY configured, skipping');
    throw new Error('No API key');
  }

  const focusKey = focus ?? 'global';
  console.log(`[AI-BRIEF] Generating ${focusKey.toUpperCase()} brief...`);

  const systemPrompt = SYSTEM_PROMPTS[focusKey] ?? SYSTEM_PROMPTS.global;
  const gatherData = DATA_GATHERERS[focusKey] ?? DATA_GATHERERS.global;
  const userData = gatherData();

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 2500,
    temperature: 0.3,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: `Generate intelligence brief based on this data:\n\n${userData}`,
    }],
  });

  const textBlock = message.content.find((b) => b.type === 'text');
  const html = sanitizeServerHtml(textBlock?.text ?? '<p>Brief generation failed</p>');

  const cacheKey = focus ? `brief:${focus}` : 'brief';
  const brief: BriefResponse = {
    html,
    generatedAt: new Date().toISOString(),
    model: 'claude-sonnet-4-5-20250929',
    sources: SOURCE_LABELS[focusKey] ?? SOURCE_LABELS.global,
  };

  cache.set(cacheKey, brief, TTL.BRIEF);
  console.log(`[AI-BRIEF] ${focusKey.toUpperCase()} brief generated and cached`);
  return brief;
}

/** Generate all 5 briefs in sequence. */
export async function generateAllBriefs(): Promise<void> {
  const focuses: (string | undefined)[] = [undefined, 'mideast', 'ukraine', 'domestic', 'intel'];
  for (const focus of focuses) {
    try {
      await fetchBrief(focus);
    } catch (err) {
      console.error(`[AI-BRIEF] ${focus ?? 'global'} failed:`, err instanceof Error ? err.message : err);
    }
  }
}
