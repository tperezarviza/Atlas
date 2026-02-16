import { cache } from '../cache.js';
import { TTL } from '../config.js';
import { redisGet, redisSet } from '../redis.js';
import type { NewsPoint, Conflict, InternetIncident, HostilityPair } from '../types.js';
import type { MilitaryFlight } from '../types.js';

export interface CountryInstability {
  code: string;
  name: string;
  score: number;           // 0-100 composite
  baseline: number;        // static baseline
  eventScore: number;      // dynamic event-driven score
  factors: {
    news: number;          // 0-100
    conflicts: number;     // 0-100
    internet: number;      // 0-100
    flights: number;       // 0-100
    hostility: number;     // 0-100
  };
  trend: 'rising' | 'stable' | 'falling';
  sparkline: number[];     // last 48 scores
}

interface SparklineEntry {
  score: number;
  ts: number;
}

// 33 monitored countries with static baselines (0-100)
const COUNTRY_BASELINES: { code: string; name: string; baseline: number; lat: number; lng: number }[] = [
  { code: 'AF', name: 'Afghanistan',    baseline: 85, lat: 33.9, lng: 67.7 },
  { code: 'IQ', name: 'Iraq',           baseline: 72, lat: 33.2, lng: 43.7 },
  { code: 'SY', name: 'Syria',          baseline: 82, lat: 35.0, lng: 38.0 },
  { code: 'YE', name: 'Yemen',          baseline: 78, lat: 15.6, lng: 48.5 },
  { code: 'SO', name: 'Somalia',        baseline: 80, lat: 5.2,  lng: 46.2 },
  { code: 'LY', name: 'Libya',          baseline: 70, lat: 26.3, lng: 17.2 },
  { code: 'SD', name: 'Sudan',          baseline: 75, lat: 12.9, lng: 30.2 },
  { code: 'SS', name: 'South Sudan',    baseline: 77, lat: 6.9,  lng: 31.3 },
  { code: 'CD', name: 'DR Congo',       baseline: 68, lat: -4.0, lng: 21.8 },
  { code: 'NG', name: 'Nigeria',        baseline: 55, lat: 9.1,  lng: 7.5 },
  { code: 'ML', name: 'Mali',           baseline: 62, lat: 17.6, lng: -4.0 },
  { code: 'BF', name: 'Burkina Faso',   baseline: 65, lat: 12.4, lng: -1.6 },
  { code: 'MM', name: 'Myanmar',        baseline: 70, lat: 19.8, lng: 96.2 },
  { code: 'PK', name: 'Pakistan',       baseline: 50, lat: 30.4, lng: 69.3 },
  { code: 'UA', name: 'Ukraine',        baseline: 75, lat: 48.4, lng: 31.2 },
  { code: 'RU', name: 'Russia',         baseline: 45, lat: 55.8, lng: 37.6 },
  { code: 'IR', name: 'Iran',           baseline: 55, lat: 32.4, lng: 53.7 },
  { code: 'KP', name: 'North Korea',    baseline: 60, lat: 40.3, lng: 127.5 },
  { code: 'CN', name: 'China',          baseline: 30, lat: 35.9, lng: 104.2 },
  { code: 'VE', name: 'Venezuela',      baseline: 55, lat: 6.4,  lng: -66.6 },
  { code: 'HT', name: 'Haiti',          baseline: 65, lat: 19.1, lng: -72.3 },
  { code: 'ET', name: 'Ethiopia',       baseline: 60, lat: 9.1,  lng: 40.5 },
  { code: 'MZ', name: 'Mozambique',     baseline: 50, lat: -18.7, lng: 35.5 },
  { code: 'CF', name: 'Central African Rep.', baseline: 68, lat: 6.6, lng: 20.9 },
  { code: 'LB', name: 'Lebanon',        baseline: 58, lat: 33.9, lng: 35.5 },
  { code: 'IL', name: 'Israel',         baseline: 45, lat: 31.0, lng: 34.9 },
  { code: 'PS', name: 'Palestine',      baseline: 72, lat: 31.9, lng: 35.2 },
  { code: 'NE', name: 'Niger',          baseline: 55, lat: 17.6, lng: 8.1 },
  { code: 'TD', name: 'Chad',           baseline: 52, lat: 15.5, lng: 18.7 },
  { code: 'CM', name: 'Cameroon',       baseline: 45, lat: 7.4,  lng: 12.4 },
  { code: 'CO', name: 'Colombia',       baseline: 42, lat: 4.6,  lng: -74.1 },
  { code: 'MX', name: 'Mexico',         baseline: 40, lat: 23.6, lng: -102.6 },
  { code: 'TW', name: 'Taiwan',         baseline: 25, lat: 23.7, lng: 121.0 },
];

// Country name → code lookup for matching cached data
const NAME_TO_CODE: Record<string, string> = {};
const CODE_TO_INFO: Record<string, { name: string; baseline: number; lat: number; lng: number }> = {};
for (const c of COUNTRY_BASELINES) {
  CODE_TO_INFO[c.code] = { name: c.name, baseline: c.baseline, lat: c.lat, lng: c.lng };
  NAME_TO_CODE[c.name.toLowerCase()] = c.code;
}

// Additional aliases for matching
const ALIASES: Record<string, string> = {
  'democratic republic of the congo': 'CD', 'drc': 'CD', 'dr congo': 'CD', 'congo-kinshasa': 'CD',
  'republic of the congo': 'CD',
  'south sudan': 'SS',
  'burkina faso': 'BF',
  'north korea': 'KP', 'dprk': 'KP',
  'central african republic': 'CF', 'car': 'CF',
  'palestinian territory': 'PS', 'gaza': 'PS', 'west bank': 'PS',
  'burma': 'MM',
};

function resolveCountryCode(name: string): string | null {
  const lower = name.toLowerCase().trim();
  if (NAME_TO_CODE[lower]) return NAME_TO_CODE[lower];
  if (ALIASES[lower]) return ALIASES[lower];
  // Try partial matching
  for (const [key, code] of Object.entries(NAME_TO_CODE)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }
  for (const [key, code] of Object.entries(ALIASES)) {
    if (lower.includes(key) || key.includes(lower)) return code;
  }
  return null;
}

// Geo-distance check (rough, for matching events to countries)
function isNear(lat1: number, lng1: number, lat2: number, lng2: number, radiusDeg: number): boolean {
  return Math.abs(lat1 - lat2) < radiusDeg && Math.abs(lng1 - lng2) < radiusDeg;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function computeNewsFactor(news: NewsPoint[], countryCode: string): number {
  const info = CODE_TO_INFO[countryCode];
  if (!info || !news.length) return 0;

  const nearby = news.filter(n => isNear(n.lat, n.lng, info.lat, info.lng, 5));
  if (!nearby.length) return 0;

  const avgTone = nearby.reduce((sum, n) => sum + n.tone, 0) / nearby.length;
  const negCount = nearby.filter(n => n.tone < -2).length;

  const volumeScore = clamp(nearby.length / 5, 0, 1) * 40;
  const toneScore = clamp((-avgTone) / 8, 0, 1) * 40;
  const negRatio = clamp(negCount / Math.max(nearby.length, 1), 0, 1) * 20;

  return clamp(Math.round(volumeScore + toneScore + negRatio), 0, 100);
}

function computeConflictFactor(conflicts: Conflict[], countryCode: string): number {
  const info = CODE_TO_INFO[countryCode];
  if (!info || !conflicts.length) return 0;

  const nearby = conflicts.filter(c => isNear(c.lat, c.lng, info.lat, info.lng, 5));
  if (!nearby.length) return 0;

  const severityWeights: Record<string, number> = { critical: 25, high: 15, medium: 8, low: 3 };
  let score = 0;
  for (const c of nearby) {
    score += severityWeights[c.severity] ?? 5;
    if (c.trend === 'escalating') score += 5;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeInternetFactor(incidents: InternetIncident[], countryCode: string): number {
  if (!incidents.length) return 0;

  const matching = incidents.filter(i =>
    i.countryCode?.toUpperCase() === countryCode
  );
  if (!matching.length) return 0;

  // Each incident = significant disruption
  return clamp(matching.length * 25, 0, 100);
}

function computeFlightFactor(flights: MilitaryFlight[], countryCode: string): number {
  const info = CODE_TO_INFO[countryCode];
  if (!info || !flights.length) return 0;

  const nearby = flights.filter(f => isNear(f.lat, f.lng, info.lat, info.lng, 5));
  if (!nearby.length) return 0;

  const catWeights: Record<string, number> = {
    bomber: 20, fighter: 15, surveillance: 12, command: 10,
    tanker: 8, transport: 5, helicopter: 5, unknown: 3,
  };

  let score = 0;
  for (const f of nearby) {
    score += catWeights[f.category] ?? 3;
  }

  return clamp(Math.round(score), 0, 100);
}

function computeHostilityFactor(hostility: HostilityPair[], countryCode: string): number {
  if (!hostility.length) return 0;
  const info = CODE_TO_INFO[countryCode];
  if (!info) return 0;

  const name = info.name.toLowerCase();
  const matching = hostility.filter(h =>
    h.codeA?.toUpperCase() === countryCode ||
    h.codeB?.toUpperCase() === countryCode ||
    h.countryA?.toLowerCase().includes(name) ||
    h.countryB?.toLowerCase().includes(name)
  );

  if (!matching.length) return 0;

  // Lower (more negative) avgTone = more hostile
  const worstTone = Math.min(...matching.map(h => h.avgTone));
  const pairCount = matching.length;

  const toneScore = clamp((-worstTone) / 6, 0, 1) * 60;
  const pairScore = clamp(pairCount / 4, 0, 1) * 40;

  return clamp(Math.round(toneScore + pairScore), 0, 100);
}

function determineTrend(sparkline: number[]): 'rising' | 'stable' | 'falling' {
  if (sparkline.length < 3) return 'stable';
  const recent = sparkline.slice(-3);
  const older = sparkline.slice(-6, -3);
  if (!older.length) return 'stable';

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = recentAvg - olderAvg;

  if (diff > 3) return 'rising';
  if (diff < -3) return 'falling';
  return 'stable';
}

const MAX_SPARKLINE = 48; // 24h at 30min intervals
const REDIS_KEY_PREFIX = 'cii:sparkline:';

export async function computeCII(): Promise<void> {
  console.log('[CII] Computing Country Instability Index...');

  // Gather cached data
  const news = (cache.get('news') as NewsPoint[] | undefined) ?? [];
  const conflicts = (cache.get('conflicts') as Conflict[] | undefined) ?? [];
  const incidents = (cache.get('ooni') as InternetIncident[] | undefined) ?? [];
  const flights = (cache.get('flights') as MilitaryFlight[] | undefined) ?? [];
  const hostility = (cache.get('hostility') as HostilityPair[] | undefined) ?? [];

  // Dynamic weighting: if a global source is empty (API down / rate-limited),
  // redistribute its weight proportionally among available factors.
  const BASE_WEIGHTS = {
    news: 0.25,
    conflicts: 0.35,
    internet: 0.10,
    flights: 0.10,
    hostility: 0.20,
  };
  const available: Record<string, boolean> = {
    news: news.length > 0,
    conflicts: conflicts.length > 0,
    internet: true, // incidents can legitimately be 0
    flights: flights.length > 0,
    hostility: hostility.length > 0,
  };
  // Compute effective weights: redistribute unavailable weight
  const totalAvailable = Object.entries(available)
    .filter(([, ok]) => ok)
    .reduce((sum, [key]) => sum + BASE_WEIGHTS[key as keyof typeof BASE_WEIGHTS], 0);
  const weights: Record<string, number> = {};
  for (const [key, ok] of Object.entries(available)) {
    weights[key] = ok && totalAvailable > 0
      ? BASE_WEIGHTS[key as keyof typeof BASE_WEIGHTS] / totalAvailable
      : 0;
  }

  const degraded = Object.values(available).filter(ok => !ok).length;
  if (degraded > 0) {
    const missing = Object.entries(available).filter(([, ok]) => !ok).map(([k]) => k);
    console.log(`[CII] Degraded mode: ${missing.join(', ')} unavailable — weights redistributed`);
  }

  const results: CountryInstability[] = [];

  for (const country of COUNTRY_BASELINES) {
    const { code, name, baseline } = country;

    // Compute each factor (0-100)
    const newsFactor = computeNewsFactor(news, code);
    const conflictFactor = computeConflictFactor(conflicts, code);
    const internetFactor = computeInternetFactor(incidents, code);
    const flightFactor = computeFlightFactor(flights, code);
    const hostilityFactor = computeHostilityFactor(hostility, code);

    // Dynamic weighted event score
    const eventScore = Math.round(
      newsFactor * weights.news +
      conflictFactor * weights.conflicts +
      internetFactor * weights.internet +
      flightFactor * weights.flights +
      hostilityFactor * weights.hostility
    );

    // Composite: baseline × 0.40 + eventScore × 0.60
    const score = clamp(Math.round(baseline * 0.40 + eventScore * 0.60), 0, 100);

    // Load sparkline from Redis, append new score
    const redisKey = `${REDIS_KEY_PREFIX}${code}`;
    let history = await redisGet<SparklineEntry[]>(redisKey) ?? [];
    history.push({ score, ts: Date.now() });
    if (history.length > MAX_SPARKLINE) {
      history = history.slice(-MAX_SPARKLINE);
    }
    await redisSet(redisKey, history); // no TTL, persistent

    const sparkline = history.map(h => h.score);
    const trend = determineTrend(sparkline);

    results.push({
      code,
      name,
      score,
      baseline,
      eventScore,
      factors: {
        news: newsFactor,
        conflicts: conflictFactor,
        internet: internetFactor,
        flights: flightFactor,
        hostility: hostilityFactor,
      },
      trend,
      sparkline,
    });
  }

  // Sort by score descending (most unstable first)
  results.sort((a, b) => b.score - a.score);

  cache.set('cii', results, TTL.CII);
  const top5 = results.slice(0, 5).map(r => `${r.code}=${r.score}`).join(' ');
  console.log(`[CII] ${results.length} countries scored | top5: ${top5} | sources: news=${news.length} conflicts=${conflicts.length} ooni=${incidents.length} flights=${flights.length} hostility=${hostility.length}`);
}
