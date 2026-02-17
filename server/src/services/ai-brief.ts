import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { aiComplete } from '../utils/ai-client.js';
import type {
  BriefResponse, Conflict, NewsPoint, FeedItem, MarketSection,
  TwitterIntelItem, Alert, ExecutiveOrder, CongressBill, SenateNomination,
  MacroItem, EconomicEvent, CyberThreatPulse, PropagandaEntry,
  HostilityPair, InternetIncident, ArmedGroup, UkraineFrontData,
  NaturalEvent,
} from '../types.js';
import type { Earthquake } from './earthquakes.js';
import type { GoogleTrendsData } from './google-trends-bq.js';

// ── Keyword filters for regional data selection ──

const ME_KW = /\b(israel|palestine|gaza|iran|iraq|syria|lebanon|yemen|houthi|saudi|gulf|turkey|egypt|jordan|hezbollah|hamas|tehran|baghdad|damascus|beirut|riyadh|qatar|bahrain|oman|kuwait|red sea|hormuz|bab.el.mandeb|sinai|idf|irgc|netanyahu)\b/i;
const UA_KW = /\b(ukrain|russia|kyiv|moscow|donetsk|zaporizhzhi|kherson|crimea|kursk|nato|zelensk|putin|kremlin|donbas|luhansk|mariupol|bakhmut|avdiivka|black sea|wagner|patriot|himars|f.16|storm shadow)\b/i;
const DOMESTIC_KW = /\b(congress|senate|house|executive order|border|immigra|tariff|trade war|fed |federal reserve|inflation|gdp|unemploy|doge|supreme court|trump|white house|biden|treasury|sec |ftc |fbi |doj |irs |epa )\b/i;
const AR_KW = /\b(argentin|milei|villarruel|bullrich|caputo|sturzenegger|cristina|kirchner|massa|grabois|kicillof|merval|bcra|peso|ars|inflaci[oó]n|devaluaci|congreso.argentin|ley.bases|dnu|sindicato|paro.general|reforma.laboral|reforma.jubilatoria|reforma.impositiva|codigo.penal|edad.imputabilidad|vaca.muerta|ypf|litio|mercosur|cgt|buenos.aires)\b/i;

function filterByKeyword<T>(items: T[], kw: RegExp, getText: (item: T) => string): T[] {
  return items.filter(item => kw.test(getText(item)));
}

// ── Shared analytical rules (injected into desk prompts) ──

const STRATEGIC_RULES = `- Frame US foreign policy as strength-based strategic deterrence
- Prioritize threats from adversary nations (Iran, China, Russia, North Korea) over allied disagreements
- Note positive developments for US interests with appropriate context`;

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
${STRATEGIC_RULES}
- When analyzing economic data, highlight indicators of strength and growth

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
<p>What to expect next across all theaters. Reference any propaganda narrative shifts that might indicate upcoming actions.</p>
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
${STRATEGIC_RULES}

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
- Frame US foreign policy as strength-based strategic deterrence
- Prioritize threats from adversary nations over allied disagreements
- Note positive developments for US/Ukrainian interests with appropriate context

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
- Frame border security as a national security issue
- Note DOGE efficiency initiatives and their fiscal impact positively
- Track executive actions as policy momentum indicators
- Highlight market-positive policy outcomes
- When analyzing economic data, highlight indicators of strength and growth

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

  argentina: `You are ATLAS ARGENTINA DESK, a senior political-economic analyst specializing in Argentine domestic and foreign affairs.

FOCUS AREAS: Milei administration reforms (fiscal, monetary, deregulation), Congressional dynamics (Ley Bases, DNU, veto overrides), economic indicators (inflation, reserves, USD/ARS official + blue gap, country risk), labor relations (sindicatos, paro general, reforma laboral), judicial reform (reforma jubilatoria, reforma impositiva, codigo penal, edad imputabilidad), opposition dynamics (Cristina Kirchner, Sergio Massa, Juan Grabois, Axel Kicillof), social unrest, IMF compliance, energy (Vaca Muerta, YPF, lithium), trade (Mercosur, US/China/Brazil).

KEY ACTORS: Government: Milei, Villarruel, Bullrich, Caputo, Sturzenegger. Opposition: Cristina Kirchner, Massa, Grabois, Kicillof. Institutions: BCRA, CNV, Congreso, CGT.

RULES:
- Write in English only
- Be direct, factual, reform-tracking focused
- Lead with executive actions and economic impact
- Track Congressional dynamics on reform bills
- Note market reactions (Merval, USD/ARS, bonds)
- Flag social unrest indicators (strikes, protests, roadblocks)
- Track inflation and reserve data as leading indicators
- When analyzing reforms, frame as structural modernization progress
- Distinguish between CFK-aligned and non-aligned opposition

FORMAT (use HTML tags):
<h2>■ ARGENTINA OVERVIEW</h2>
<p>2-3 sentences: political climate, reform progress, economic trajectory</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Executive actions, Congressional votes, economic data, social events</li></ul>
<h2>■ REFORM TRACKER</h2>
<p>Status of key reforms: fiscal, laboral, jubilatoria, impositiva, penal</p>
<h2>■ ECONOMIC PULSE</h2>
<p>Inflation, reserves, USD/ARS, Merval, country risk, IMF compliance</p>
<h2>■ SOCIAL CLIMATE</h2>
<p>Strikes, protests, approval ratings, opposition moves</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>Upcoming votes, data releases, scheduled protests/events</p>`,

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
${STRATEGIC_RULES}

FORMAT (use HTML tags):
<h2>■ INTELLIGENCE OVERVIEW</h2>
<p>2-3 sentences: information environment, active threat campaigns</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul><li>Cyber attacks, disinformation campaigns, intelligence community alerts</li></ul>
<h2>■ CYBER THREAT LANDSCAPE</h2>
<p>Active APT campaigns, targeted countries, malware families, IOC summary</p>
<h2>■ INFORMATION WARFARE</h2>
<p>State media narrative analysis: what Russia, China, Iran, Turkey are pushing and why. Analyze from a Western democratic security perspective. Identify narratives designed to undermine US interests, NATO cohesion, or democratic institutions. Track narrative coordination between adversary state media (Russia-China-Iran alignment). Note narrative DIRECTION per country (escalating/de-escalating/pivoting/stable). Highlight specific narrative shifts — what appeared, what disappeared, what intensified.</p>
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
  const macro = cache.get<MacroItem[]>('macro') ?? [];
  const markets = cache.get<MarketSection[]>('markets') ?? [];
  const econ = cache.get<EconomicEvent[]>('economic_calendar') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];

  const trumpFeed = feed.filter(f => f.category === 'trump' || f.category === 'musk' || f.category === 'conservative').slice(0, 8);
  const highImpactEcon = econ.filter(e => e.impact === 'high').slice(0, 8);

  return `EXECUTIVE ORDERS: ${JSON.stringify(orders.slice(0, 10).map(o => ({ number: o.number, title: o.title, signing_date: o.signing_date, topics: o.topics, status: o.status })))}

CONGRESS BILLS: ${JSON.stringify(bills.slice(0, 10).map(b => ({ number: b.number, title: b.title, status: b.status, relevance: b.relevance, latest_action: b.latest_action })))}

NOMINATIONS: ${JSON.stringify(noms.slice(0, 8).map(n => ({ name: n.name, position: n.position, status: n.status })))}

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

function gatherArgentinaData(): string {
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const markets = cache.get<MarketSection[]>('markets') ?? [];
  const forex = cache.get<MarketSection[]>('forex') ?? [];
  const econ = cache.get<EconomicEvent[]>('economic_calendar') ?? [];

  const arNews = filterByKeyword([...news].sort((a, b) => a.tone - b.tone), AR_KW, n => n.headline).slice(0, 15);
  const arFeed = filterByKeyword(feed, AR_KW, f => f.text).slice(0, 8);
  const arTweets = tweets.filter(t => AR_KW.test(t.text)).slice(0, 8);
  const allMarketItems = [...(markets?.flatMap(s => s.items) ?? []), ...(forex?.flatMap(s => s.items) ?? [])];
  const arMarkets = allMarketItems.filter(i => /merval|ars/i.test(i.name));
  const arEcon = econ.filter(e => e.currency === 'ARS' || AR_KW.test(e.event_name));

  return `ARGENTINA NEWS: ${JSON.stringify(arNews.map(n => ({ headline: n.headline, tone: n.tone, source: n.source })))}

ARGENTINA RSS/RRSS: ${JSON.stringify(arFeed.map(f => ({ handle: f.handle, text: f.text.substring(0, 150), category: f.category })))}

ARGENTINA TWEETS: ${JSON.stringify(arTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username })))}

ARGENTINA MARKETS: ${JSON.stringify(arMarkets.map(i => ({ name: i.name, price: i.price, delta: i.delta })))}

ARGENTINA ECONOMIC EVENTS: ${JSON.stringify(arEcon.map(e => ({ event: e.event_name, date: e.date, actual: e.actual, forecast: e.forecast })))}

Current UTC: ${new Date().toISOString()}`;
}

const DATA_GATHERERS: Record<string, () => string> = {
  global: gatherGlobalData,
  mideast: gatherMideastData,
  ukraine: gatherUkraineData,
  domestic: gatherDomesticData,
  argentina: gatherArgentinaData,
  intel: gatherIntelData,
};

const SOURCE_LABELS: Record<string, string[]> = {
  global: ['ACLED', 'GDELT', 'Markets', 'USGS', 'EONET', 'X/Twitter', 'Alerts', 'Google Trends'],
  mideast: ['ACLED', 'GDELT', 'X/Twitter', 'Hostility Index', 'Propaganda Monitor', 'Google Trends'],
  ukraine: ['ACLED', 'GDELT', 'ISW', 'X/Twitter', 'Hostility Index', 'RU Propaganda', 'Google Trends'],
  domestic: ['Executive Orders', 'Congress', 'Macro', 'Markets', 'Econ Calendar', 'Google Trends'],
  argentina: ['GDELT', 'RSS Argentina', 'X/Twitter', 'Markets', 'Econ Calendar', 'Google Trends'],
  intel: ['Cyber OTX', 'Propaganda Monitor', 'Hostility Index', 'OONI', 'X/Twitter', 'Armed Groups', 'Google Trends'],
};

// ── Google Trends context for briefs ──

const TRENDS_COUNTRY_MAP: Record<string, string[]> = {
  global: ['US', 'GB', 'DE', 'FR', 'RU', 'CN'],
  mideast: ['IL', 'IR', 'SA', 'TR', 'EG', 'IQ'],
  ukraine: ['UA', 'RU', 'PL', 'DE'],
  domestic: ['US'],
  argentina: ['AR', 'BR', 'US'],
  intel: ['US', 'GB', 'RU', 'CN', 'IR'],
};

function gatherTrendsContext(desk: string): string {
  const trendsData = cache.get<GoogleTrendsData>('google_trends');
  if (!trendsData) return '';

  const countries = TRENDS_COUNTRY_MAP[desk] ?? [];
  const relevant = countries
    .flatMap(c => (trendsData.topRisingByCountry[c] ?? []).slice(0, 3)
      .map(t => `${c}: "${t.term}" (+${t.score}%)`))
    .slice(0, 10);

  let context = '';

  if (relevant.length > 0) {
    context = `\n\nPUBLIC SEARCH TRENDS (Google Trends rising):\n${relevant.join('\n')}`;
  }

  // Add multi-country signals if any are geopolitical
  const geoAlerts = trendsData.geoTerms
    .filter(t => t.signal === 'critical' || t.signal === 'strong')
    .slice(0, 3);

  if (geoAlerts.length > 0) {
    context += `\n\nMULTI-COUNTRY TREND ALERTS:\n${geoAlerts.map(t =>
      `"${t.term}" trending in ${t.countryCount} countries (${t.countries.map(c => c.code).join(', ')})`
    ).join('\n')}`;
  }

  return context;
}

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

function calculateConfidence(): number {
  const checks = [
    { key: 'news', weight: 25 },
    { key: 'feed', weight: 15 },
    { key: 'twitter', weight: 15 },
    { key: 'conflicts', weight: 15 },
    { key: 'markets', weight: 10 },
    { key: 'propaganda', weight: 10 },
    { key: 'google_trends', weight: 10 },
  ];

  let totalWeight = 0;
  let freshWeight = 0;
  for (const c of checks) {
    totalWeight += c.weight;
    if (cache.has(c.key)) {
      freshWeight += cache.isFresh(c.key) ? c.weight : c.weight * 0.5;
    }
  }

  return Math.round((freshWeight / totalWeight) * 100);
}

// ── Public API ──

export async function fetchBrief(focus?: string): Promise<BriefResponse> {
  const focusKey = focus ?? 'global';
  console.log(`[AI-BRIEF] Generating ${focusKey.toUpperCase()} brief...`);

  const systemPrompt = SYSTEM_PROMPTS[focusKey] ?? SYSTEM_PROMPTS.global;
  const gatherData = DATA_GATHERERS[focusKey] ?? DATA_GATHERERS.global;
  const userData = gatherData();
  const trendsContext = gatherTrendsContext(focusKey);

  const response = await aiComplete(
    systemPrompt,
    `Generate intelligence brief based on this data:\n\n${userData}${trendsContext}`,
    { maxTokens: 2500 },
  );

  const html = sanitizeServerHtml(response.text || '<p>Brief generation failed</p>');

  const cacheKey = focus ? `brief:${focus}` : 'brief';
  const brief: BriefResponse = {
    html,
    generatedAt: new Date().toISOString(),
    model: response.provider,
    sources: SOURCE_LABELS[focusKey] ?? SOURCE_LABELS.global,
    confidence: calculateConfidence(),
  };

  await cache.setWithRedis(cacheKey, brief, TTL.BRIEF, 24 * 3600);
  console.log(`[AI-BRIEF] ${focusKey.toUpperCase()} generated via ${response.provider} in ${response.latencyMs}ms`);
  return brief;
}

/** Generate 6 specialist briefs in parallel, then unify into a single document. */
export async function generateAllBriefs(): Promise<void> {
  const focuses = ['global', 'domestic', 'argentina', 'mideast', 'ukraine', 'intel'];
  const results = await Promise.allSettled(
    focuses.map(f => fetchBrief(f === 'global' ? undefined : f))
  );

  const specialistBriefs: Record<string, string> = {};
  focuses.forEach((f, i) => {
    if (results[i].status === 'fulfilled') {
      specialistBriefs[f] = (results[i] as PromiseFulfilledResult<BriefResponse>).value.html;
    }
  });

  // Generate unified summary
  const propaganda = cache.get<PropagandaEntry[]>('propaganda') ?? [];
  const propagandaContext = propaganda.map(p =>
    `${p.country} (${p.outlet}): ${p.narratives.join('; ')}`
  ).join('\n');

  const summarizerPrompt = `You are ATLAS UNIFIED BRIEF EDITOR. Combine these 6 specialist intelligence briefs into a single coherent document.

STRUCTURE (use HTML h2 tags):
1. ■ EXECUTIVE SUMMARY — 3-4 sentences: global threat level, top 3 developments
2. ■ UNITED STATES — From domestic desk
3. ■ ARGENTINA — From argentina desk
4. ■ MIDDLE EAST — From mideast desk
5. ■ UKRAINE — From ukraine desk
6. ■ INTELLIGENCE & CYBER — From intel desk
7. ■ PROPAGANDA WATCH — Synthesize what Russia, China, Iran, Palestine, Turkey state media are pushing. Cross-reference with real events. Note coordination and narrative shifts.
8. ■ MARKET IMPLICATIONS — Cross-cutting market impacts from all theaters
9. ■ 72-HOUR OUTLOOK — Consolidated across all theaters

RULES:
- Write in English only
- Be concise — each section 4-8 bullet points MAX
- Cross-reference between sections where relevant
- Flag immediate threats with FLASH: prefix
- The Propaganda Watch section should analyze narratives critically from a Western democratic security perspective`;

  const summarizerData = `SPECIALIST BRIEFS:\n${Object.entries(specialistBriefs).map(([k, v]) => `--- ${k.toUpperCase()} ---\n${v}`).join('\n\n')}

PROPAGANDA RAW DATA:\n${propagandaContext}`;

  try {
    const response = await aiComplete(summarizerPrompt, summarizerData, { maxTokens: 5000 });
    const html = sanitizeServerHtml(response.text);

    const unified: BriefResponse = {
      html,
      generatedAt: new Date().toISOString(),
      model: response.provider,
      sources: ['All Desks', 'ACLED', 'GDELT', 'Markets', 'X/Twitter', 'Congress', 'USGS', 'Propaganda Monitor', 'Google Trends'],
      confidence: calculateConfidence(),
    };

    await cache.setWithRedis('brief', unified, TTL.BRIEF, 24 * 3600);
    console.log(`[AI-BRIEF] UNIFIED brief generated via ${response.provider} in ${response.latencyMs}ms`);
  } catch (err) {
    console.error('[AI-BRIEF] Unified summarizer failed:', err);
  }
}

/** Generate an emergency surge brief focused on a keyword. */
export async function generateSurgeBrief(keyword: string): Promise<void> {
  console.log(`[AI-BRIEF] Generating SURGE brief for keyword: "${keyword}"...`);

  const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? [];
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const feed = cache.get<FeedItem[]>('feed') ?? [];
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];

  const kw = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const matchedTweets = tweets.filter(t => kw.test(t.text)).slice(0, 10);
  const matchedNews = news.filter(n => kw.test(n.headline)).slice(0, 10);
  const matchedFeed = feed.filter(f => kw.test(f.text)).slice(0, 5);
  const matchedConflicts = conflicts.filter(c => kw.test(c.name) || kw.test(c.region)).slice(0, 5);

  const userData = `SURGE KEYWORD: "${keyword}"

MATCHING TWEETS: ${JSON.stringify(matchedTweets.map(t => ({ text: t.text.substring(0, 150), author: t.author.username, category: t.category })))}

MATCHING NEWS: ${JSON.stringify(matchedNews.map(n => ({ headline: n.headline, tone: n.tone, source: n.source })))}

MATCHING LEADER FEEDS: ${JSON.stringify(matchedFeed.map(f => ({ handle: f.handle, text: f.text.substring(0, 150) })))}

MATCHING CONFLICTS: ${JSON.stringify(matchedConflicts.map(c => ({ name: c.name, severity: c.severity, trend: c.trend })))}

Current UTC: ${new Date().toISOString()}`;

  const systemPrompt = `You are ATLAS EMERGENCY DESK. A surge in mentions of "${keyword}" has been detected across intelligence feeds. Analyze what is happening based on the available data.

RULES:
- Write in English only
- Be direct, concise, urgent
- Lead with the most likely explanation for the surge
- Separate confirmed facts from speculation

FORMAT (use HTML tags):
<h2>■ SURGE ANALYSIS: ${keyword.toUpperCase()}</h2>
<p>What is happening and why mentions are surging</p>
<h2>■ KEY DEVELOPMENTS</h2>
<ul><li>Confirmed events driving the surge</li></ul>
<h2>■ ASSESSMENT</h2>
<p>Threat level and recommended actions</p>`;

  try {
    const response = await aiComplete(systemPrompt, userData, { maxTokens: 1500 });
    const html = sanitizeServerHtml(response.text || '<p>Surge brief generation failed</p>');

    const brief: BriefResponse = {
      html,
      generatedAt: new Date().toISOString(),
      model: response.provider,
      sources: ['Twitter Surge', 'GDELT', 'RSS Feeds', 'ACLED'],
    };

    await cache.setWithRedis('brief:emergency', brief, 3600_000, 3600); // 1h TTL
    console.log(`[AI-BRIEF] SURGE brief for "${keyword}" generated via ${response.provider}`);
  } catch (err) {
    console.error(`[AI-BRIEF] Surge brief failed:`, err instanceof Error ? err.message : err);
  }
}
