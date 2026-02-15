import { cache } from '../cache.js';
import { TTL } from '../config.js';
import { redisGet, redisSet } from '../redis.js';
import type { Conflict, NewsPoint, InternetIncident } from '../types.js';
import type { Earthquake } from './earthquakes.js';

// ── Welford state for one baseline ──

interface WelfordState {
  count: number;
  mean: number;
  m2: number;          // sum of squared deviations
  lastUpdated: string;
}

function welfordUpdate(state: WelfordState, newValue: number): WelfordState {
  const count = state.count + 1;
  const delta = newValue - state.mean;
  const mean = state.mean + delta / count;
  const delta2 = newValue - mean;
  const m2 = state.m2 + delta * delta2;
  return { count, mean, m2, lastUpdated: new Date().toISOString() };
}

function welfordZScore(state: WelfordState, value: number): number | null {
  if (state.count < 5) return null; // not enough data
  const variance = state.m2 / state.count;
  const stddev = Math.sqrt(variance);
  if (stddev < 0.001) return null; // avoid division by near-zero
  return (value - state.mean) / stddev;
}

// ── Anomaly definition ──

export interface Anomaly {
  id: string;
  eventType: string;
  region: string;
  weekday: string;
  currentValue: number;
  baselineMean: number;
  baselineStddev: number;
  zScore: number;
  severity: 'watch' | 'elevated' | 'critical';
  sampleCount: number;
  description: string;
  detectedAt: string;
}

// ── Event types to monitor ──

const REGIONS = [
  'global', 'europe', 'middle_east', 'asia', 'americas', 'africa',
  'europe_ukraine', 'baltic_sea', 'black_sea', 'taiwan_strait', 'korean_peninsula', 'us_east_coast',
] as const;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const Z_THRESHOLDS = { watch: 1.5, elevated: 2.0, critical: 3.0 };
const CALIBRATION_MIN = 10; // minimum samples before alerting

// ── Count current values per event type × region ──

function countCurrentValues(): Map<string, number> {
  const counts = new Map<string, number>();

  // Military flights by region
  const flights = cache.get<any[]>('flights') ?? [];
  for (const region of REGIONS) {
    const key = `military_flights:${region}`;
    if (region === 'global') {
      counts.set(key, flights.length);
    } else {
      counts.set(key, flights.filter((f: any) => f.region === region).length);
    }
  }

  // GDELT negative articles
  const news = cache.get<NewsPoint[]>('news') ?? [];
  const negativeNews = news.filter(n => n.tone < -5);
  counts.set('gdelt_negative:global', negativeNews.length);

  // ACLED events
  const conflicts = cache.get<Conflict[]>('conflicts') ?? [];
  counts.set('acled_events:global', conflicts.length);
  counts.set('acled_events:middle_east', conflicts.filter(c => /middle east|arab|levant/i.test(c.region)).length);
  counts.set('acled_events:africa', conflicts.filter(c => /africa/i.test(c.region)).length);
  counts.set('acled_events:europe', conflicts.filter(c => /europe/i.test(c.region)).length);
  counts.set('acled_events:asia', conflicts.filter(c => /asia/i.test(c.region)).length);

  // Earthquakes (M4+)
  const quakes = cache.get<Earthquake[]>('earthquakes') ?? [];
  counts.set('earthquakes:global', quakes.filter(q => q.magnitude >= 4.0).length);

  // OONI shutdowns
  const ooni = cache.get<InternetIncident[]>('ooni') ?? [];
  counts.set('ooni_shutdowns:global', ooni.filter(i => !i.endDate).length);

  return counts;
}

// ── Main detection function ──

export async function runAnomalyDetection(): Promise<void> {
  console.log('[ANOMALY] Running anomaly detection...');

  const weekday = WEEKDAYS[new Date().getUTCDay()];
  const currentValues = countCurrentValues();
  const anomalies: Anomaly[] = [];

  for (const [metricKey, currentValue] of currentValues) {
    const baselineKey = `baseline:${metricKey}:${weekday}`;

    // Load existing Welford state from Redis
    let state = await redisGet<WelfordState>(baselineKey);
    if (!state) {
      state = { count: 0, mean: 0, m2: 0, lastUpdated: new Date().toISOString() };
    }

    // Calculate z-score BEFORE updating baseline (detect against historical)
    const zScore = welfordZScore(state, currentValue);

    // Check for anomaly
    if (zScore !== null && state.count >= CALIBRATION_MIN) {
      let severity: Anomaly['severity'] | null = null;
      if (Math.abs(zScore) >= Z_THRESHOLDS.critical) severity = 'critical';
      else if (Math.abs(zScore) >= Z_THRESHOLDS.elevated) severity = 'elevated';
      else if (Math.abs(zScore) >= Z_THRESHOLDS.watch) severity = 'watch';

      if (severity) {
        const [eventType, region] = metricKey.split(':');
        const stddev = Math.sqrt(state.m2 / state.count);

        anomalies.push({
          id: `anomaly-${metricKey}-${weekday}-${Date.now()}`,
          eventType,
          region: region ?? 'global',
          weekday,
          currentValue,
          baselineMean: Math.round(state.mean * 10) / 10,
          baselineStddev: Math.round(stddev * 10) / 10,
          zScore: Math.round(zScore * 100) / 100,
          severity,
          sampleCount: state.count,
          description: `${eventType.replace(/_/g, ' ')} in ${region ?? 'global'} on ${weekday}: ${currentValue} (baseline: ${state.mean.toFixed(1)} ± ${stddev.toFixed(1)}, z=${zScore.toFixed(2)})`,
          detectedAt: new Date().toISOString(),
        });
      }
    }

    // Update Welford baseline with current value
    state = welfordUpdate(state, currentValue);
    await redisSet(baselineKey, state, 90 * 24 * 3600); // 90 day TTL
  }

  // Sort anomalies by absolute z-score descending
  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));

  cache.set('anomalies', anomalies, TTL.ANOMALY);

  if (anomalies.length > 0) {
    console.log(`[ANOMALY] ${anomalies.length} anomalies detected:`);
    for (const a of anomalies.slice(0, 5)) {
      console.log(`  [${a.severity.toUpperCase()}] ${a.description}`);
    }
  } else {
    console.log('[ANOMALY] No anomalies detected (baselines: ${currentValues.size} metrics tracked)');
  }
}
