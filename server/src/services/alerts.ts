import { createHash } from 'crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { cache } from '../cache.js';
import { redisGet, redisSet } from '../redis.js';
import type { Alert, AlertPriority, AlertSource, AlertEventType, Conflict, NewsPoint, InternetIncident, MarketSection, ExecutiveOrder, NaturalEvent, TwitterIntelItem, FeedItem } from '../types.js';
import type { Earthquake } from './earthquakes.js';
import type { SurgeAlert } from './surge-detection.js';

const MAX_ALERTS = 200;
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24h

const MILITARY_KEYWORDS = /\b(nuclear test|invasion|coup|assassination|missile|bomb|attack|strike|troops|explosion|shooting|massacre|hostage|chemical|biological|earthquake|tsunami|hurricane|typhoon|volcanic eruption)\b/i;

let alertStore: Alert[] = [];
const seenHashes = new Set<string>();

function contentHash(source: string, title: string): string {
  return createHash('md5').update(`${source}:${title}`).digest('hex');
}

function addAlert(priority: AlertPriority, source: AlertSource, title: string, detail?: string, eventType?: AlertEventType, tags?: string[]): void {
  const hash = contentHash(source, title);
  if (seenHashes.has(hash)) return;
  seenHashes.add(hash);

  alertStore.push({
    id: hash,
    priority,
    source,
    title,
    detail,
    timestamp: new Date().toISOString(),
    read: false,
    eventType,
    tags,
  });
}

function pruneOld(): void {
  const cutoff = Date.now() - RETENTION_MS;
  const before = alertStore.length;
  alertStore = alertStore.filter(a => new Date(a.timestamp).getTime() > cutoff);
  // Also prune seen hashes for removed alerts
  if (alertStore.length < before) {
    const activeHashes = new Set(alertStore.map(a => a.id));
    for (const h of seenHashes) {
      if (!activeHashes.has(h)) seenHashes.delete(h);
    }
  }
  // Cap at MAX_ALERTS (keep newest)
  if (alertStore.length > MAX_ALERTS) {
    const removed = alertStore.splice(0, alertStore.length - MAX_ALERTS);
    for (const a of removed) seenHashes.delete(a.id);
  }
}

// ── Detection Rules ──

function classifyGdeltEvent(headline: string): AlertEventType {
  const h = headline.toLowerCase();
  if (/coup|overthrow|seize/.test(h)) return 'coup';
  if (/nuclear/.test(h)) return 'nuclear';
  if (/cyber|hack|ransomware/.test(h)) return 'cyber';
  if (/protest|riot|demonstration/.test(h)) return 'protest';
  if (/terror|suicide.bomb/.test(h)) return 'terrorism';
  if (/earthquake|tsunami/.test(h)) return 'earthquake';
  if (/hurricane|typhoon|volcano|flood|wildfire/.test(h)) return 'natural_event';
  return 'military_strike';
}

function checkGdeltNews(): void {
  const news = cache.get<NewsPoint[]>('news');
  if (!news) return;

  for (const item of news) {
    if (item.tone < -8 && MILITARY_KEYWORDS.test(item.headline)) {
      const et = classifyGdeltEvent(item.headline);
      addAlert('flash', 'gdelt', `CRITICAL: ${item.headline}`, `GDELT tone ${item.tone} — ${item.source}`, et, [item.category, 'GDELT']);
    } else if (item.tone < -6 && MILITARY_KEYWORDS.test(item.headline)) {
      const et = classifyGdeltEvent(item.headline);
      addAlert('urgent', 'gdelt', `URGENT: ${item.headline}`, `GDELT tone ${item.tone} — ${item.source}`, et, [item.category, 'GDELT']);
    }
  }
}

// Track previously seen conflict IDs to detect new ones
let previousConflictIds = new Set<string>();

function checkNewConflicts(): void {
  const conflicts = cache.get<Conflict[]>('conflicts');
  if (!conflicts) return;

  const currentIds = new Set(conflicts.map(c => c.id));

  if (previousConflictIds.size > 0) {
    for (const conflict of conflicts) {
      if (!previousConflictIds.has(conflict.id)) {
        addAlert('urgent', 'acled', `New conflict reported: ${conflict.name}`, `${conflict.severity.toUpperCase()} — ${conflict.region}`, 'military_strike', [conflict.region, conflict.severity]);
      }
      // Escalating + critical
      if (conflict.trend === 'escalating' && conflict.severity === 'critical') {
        addAlert('urgent', 'acled_spike', `Escalating critical conflict: ${conflict.name}`, `${conflict.casualties} casualties, ${conflict.displaced} displaced`, 'military_strike', [conflict.region, 'ESCALATING']);
      }
    }
  }

  previousConflictIds = currentIds;
}

function checkInternetShutdowns(): void {
  const incidents = cache.get<InternetIncident[]>('ooni');
  if (!incidents) return;

  for (const inc of incidents) {
    if (!inc.endDate) {
      addAlert('priority', 'ooni', `Internet shutdown ongoing in ${inc.country}`, inc.shortDescription, 'internet', [inc.country, 'SHUTDOWN']);
    }
  }
}

function checkMarketMoves(): void {
  const sections = cache.get<MarketSection[]>('markets');
  if (!sections) return;

  for (const section of sections) {
    for (const item of section.items) {
      // Parse delta like "▲ +5.3%" or "▼ -6.1%"
      const match = item.delta.match(/([+-]?\d+\.?\d*)%/);
      if (match) {
        const pct = Math.abs(parseFloat(match[1]));
        if (pct > 5) {
          addAlert('priority', 'markets', `Market move alert: ${item.name} ${item.delta}`, `${section.title} — ${item.price}`, 'market', [item.name, section.title]);
        }
      }
    }
  }
}

function checkExecutiveOrders(): void {
  const orders = cache.get<ExecutiveOrder[]>('executive_orders');
  if (!orders) return;

  // Only alert on orders from the last 24h
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  for (const eo of orders) {
    const signed = new Date(eo.signing_date).getTime();
    if (signed > cutoff) {
      addAlert('priority', 'executive_orders', `New Executive Order: EO ${eo.number} — ${eo.title}`, `Topics: ${eo.topics.join(', ')}`, 'executive_order', eo.topics);
    }
  }
}

function checkEarthquakes(): void {
  const quakes = cache.get<Earthquake[]>('earthquakes');
  if (!quakes) return;

  for (const q of quakes) {
    const tags = [q.place, `M${q.magnitude}`];
    if (q.tsunami) tags.push('TSUNAMI');
    if (q.tsunami) {
      addAlert('flash', 'usgs', `TSUNAMI WARNING: ${q.place} — M${q.magnitude}`, `Depth ${q.depth}km • ${q.url}`, 'earthquake', tags);
    } else if (q.alert === 'red') {
      addAlert('urgent', 'usgs', `Major earthquake: M${q.magnitude} ${q.place} — USGS RED`, `Depth ${q.depth}km • ${q.url}`, 'earthquake', tags);
    } else if (q.alert === 'orange') {
      addAlert('urgent', 'usgs', `Significant earthquake: M${q.magnitude} ${q.place} — USGS ORANGE`, `Depth ${q.depth}km • ${q.url}`, 'earthquake', tags);
    } else if (q.magnitude >= 6.0) {
      addAlert('priority', 'usgs', `M${q.magnitude} earthquake: ${q.place}`, `Depth ${q.depth}km • ${q.url}`, 'earthquake', tags);
    }
  }
}

function checkNaturalEvents(): void {
  const events = cache.get<NaturalEvent[]>('natural_events');
  if (!events) return;

  for (const evt of events) {
    if (evt.severity === 'extreme') {
      addAlert('urgent', 'eonet', `EXTREME: ${evt.title}`, `${evt.category} • ${evt.link}`, 'natural_event', [evt.category]);
    } else if (evt.severity === 'severe') {
      addAlert('priority', 'eonet', `Severe: ${evt.title}`, `${evt.category} • ${evt.link}`, 'natural_event', [evt.category]);
    }
  }
}

function checkTwitterIntel(): void {
  const tweets = cache.get<TwitterIntelItem[]>('twitter');
  if (!tweets) return;

  for (const tweet of tweets) {
    // Only crisis and military categories
    if (tweet.category !== 'crisis' && tweet.category !== 'military') continue;

    const hasKeywords = MILITARY_KEYWORDS.test(tweet.text);
    const isHighPriority = tweet.priority === 'flash' || tweet.priority === 'urgent';

    if (!hasKeywords && !isHighPriority) continue;

    // Map priority: keywords + high-priority → keep tweet priority; keywords only → priority; high-priority only → keep
    let alertPriority: AlertPriority;
    if (hasKeywords && isHighPriority) {
      alertPriority = tweet.priority;
    } else if (hasKeywords) {
      alertPriority = 'priority';
    } else {
      alertPriority = tweet.priority;
    }

    const author = `@${tweet.author.username}`;
    const engagement = `${tweet.metrics.retweet_count} RT • ${tweet.metrics.like_count} likes`;
    const tweetEventType: AlertEventType = /coup|overthrow/.test(tweet.text) ? 'coup'
      : /nuclear/.test(tweet.text) ? 'nuclear'
      : /cyber|hack/.test(tweet.text) ? 'cyber'
      : /terror/.test(tweet.text) ? 'terrorism'
      : 'military_strike';
    addAlert(alertPriority, 'twitter', tweet.text.substring(0, 200), `${author} • ${engagement} • ${tweet.url}`, tweetEventType, [tweet.category, author]);
  }
}

function checkRssFeeds(): void {
  const feed = cache.get<FeedItem[]>('feed');
  if (!feed) return;

  for (const item of feed) {
    // Skip trump — handled separately by TrumpNewsPopup
    if (item.category === 'trump') continue;

    if (MILITARY_KEYWORDS.test(item.text)) {
      const priority: AlertPriority = item.category === 'military' ? 'urgent' : 'priority';
      addAlert(priority, 'rss', item.text.substring(0, 200), `${item.handle} (${item.source}) • ${item.role}`, 'military_strike', [item.category, item.source]);
    }
  }
}

function checkSurges(): void {
  const surges = cache.get<SurgeAlert[]>('surge_alerts');
  if (!surges) return;

  for (const s of surges) {
    const priority: AlertPriority = s.level === 'critical' ? 'flash'
      : s.level === 'elevated' ? 'urgent' : 'priority';
    addAlert(
      priority,
      'surge',
      `Flight surge near ${s.baseName}: ${s.currentCount} aircraft (z=${s.zScore})`,
      `Level: ${s.level.toUpperCase()} • Baseline: ${s.baselineMean}±${s.baselineStdDev} • ${s.topCallsigns.join(', ')}`,
      'surge',
      [s.baseName, s.level.toUpperCase()],
    );
  }
}

// ── Public API ──

export function analyzeAlerts(): void {
  console.log('[ALERTS] Analyzing cached data for alerts...');

  checkGdeltNews();
  checkNewConflicts();
  checkInternetShutdowns();
  checkMarketMoves();
  checkExecutiveOrders();
  checkEarthquakes();
  checkNaturalEvents();
  checkTwitterIntel();
  checkRssFeeds();
  checkSurges();
  pruneOld();

  cache.set('alerts', alertStore, 60_000);

  // Persist seenHashes to Redis for restart recovery
  redisSet('state:alertSeenHashes', [...seenHashes], 24 * 3600).catch(() => {});

  console.log(`[ALERTS] ${alertStore.length} alerts in store (${alertStore.filter(a => !a.read).length} unread)`);
}

export function getAlerts(): Alert[] {
  return [...alertStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function injectTestAlert(priority: AlertPriority, source: AlertSource, title: string, detail?: string): Alert {
  const hash = contentHash(source, `TEST-${Date.now()}-${title}`);
  const alert: Alert = { id: hash, priority, source, title, detail, timestamp: new Date().toISOString(), read: false };
  alertStore.push(alert);
  return alert;
}

export function markAlertRead(id: string): boolean {
  const alert = alertStore.find(a => a.id === id);
  if (!alert) return false;
  alert.read = true;
  return true;
}


// ── Persistence ──

import { join } from 'path';
const ALERT_STORE_PATH = join(process.cwd(), 'data', 'alert-store.json');

function loadAlerts(): void {
  try {
    const raw = readFileSync(ALERT_STORE_PATH, 'utf8');
    const data = JSON.parse(raw) as { alerts: Alert[]; hashes: string[] };
    alertStore = data.alerts || [];
    for (const h of data.hashes || []) seenHashes.add(h);
    console.log(`[ALERTS] Loaded ${alertStore.length} alerts from disk`);
  } catch {
    // No saved file yet — start fresh
  }
}

function saveAlerts(): void {
  try {
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    writeFileSync(ALERT_STORE_PATH, JSON.stringify({ alerts: alertStore, hashes: [...seenHashes] }), 'utf8');
  } catch (err) {
    console.error('[ALERTS] Failed to save alert store:', err);
  }
}

// Load on startup
loadAlerts();

// Restore from Redis if file-based load was empty
export async function restoreAlertState(): Promise<void> {
  if (seenHashes.size > 0) return; // already loaded from disk
  const saved = await redisGet<string[]>('state:alertSeenHashes');
  if (saved && Array.isArray(saved)) {
    saved.forEach(h => seenHashes.add(h));
    console.log(`[ALERTS] Restored ${saved.length} seen hashes from Redis`);
  }
}

// Save periodically (every 5 min)
setInterval(saveAlerts, 5 * 60 * 1000);
