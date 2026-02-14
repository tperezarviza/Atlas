import { createHash } from 'crypto';
import { cache } from '../cache.js';
import type { Alert, AlertPriority, AlertSource, Conflict, NewsPoint, InternetIncident, MarketSection, ExecutiveOrder } from '../types.js';

const MAX_ALERTS = 200;
const RETENTION_MS = 24 * 60 * 60 * 1000; // 24h

const MILITARY_KEYWORDS = /\b(nuclear test|invasion|coup|assassination|missile|bomb|attack|strike|troops)\b/i;

let alertStore: Alert[] = [];
const seenHashes = new Set<string>();

function contentHash(source: string, title: string): string {
  return createHash('md5').update(`${source}:${title}`).digest('hex');
}

function addAlert(priority: AlertPriority, source: AlertSource, title: string, detail?: string): void {
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

function checkGdeltNews(): void {
  const news = cache.get<NewsPoint[]>('news');
  if (!news) return;

  for (const item of news) {
    if (item.tone < -8 && MILITARY_KEYWORDS.test(item.headline)) {
      addAlert('flash', 'gdelt', `CRITICAL: ${item.headline}`, `GDELT tone ${item.tone} — ${item.source}`);
    } else if (item.tone < -6 && MILITARY_KEYWORDS.test(item.headline)) {
      addAlert('urgent', 'gdelt', `URGENT: ${item.headline}`, `GDELT tone ${item.tone} — ${item.source}`);
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
        addAlert('urgent', 'acled', `New conflict reported: ${conflict.name}`, `${conflict.severity.toUpperCase()} — ${conflict.region}`);
      }
      // Escalating + critical
      if (conflict.trend === 'escalating' && conflict.severity === 'critical') {
        addAlert('urgent', 'acled_spike', `Escalating critical conflict: ${conflict.name}`, `${conflict.casualties} casualties, ${conflict.displaced} displaced`);
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
      addAlert('priority', 'ooni', `Internet shutdown ongoing in ${inc.country}`, inc.shortDescription);
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
          addAlert('priority', 'markets', `Market move alert: ${item.name} ${item.delta}`, `${section.title} — ${item.price}`);
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
      addAlert('routine', 'executive_orders', `New Executive Order: EO ${eo.number} — ${eo.title}`, `Topics: ${eo.topics.join(', ')}`);
    }
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
  pruneOld();

  console.log(`[ALERTS] ${alertStore.length} alerts in store (${alertStore.filter(a => !a.read).length} unread)`);
}

export function getAlerts(): Alert[] {
  return [...alertStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function markAlertRead(id: string): boolean {
  const alert = alertStore.find(a => a.id === id);
  if (!alert) return false;
  alert.read = true;
  return true;
}
