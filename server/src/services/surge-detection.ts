import { cache } from '../cache.js';
import { redisGet, redisSet } from '../redis.js';
import type { MilitaryFlight } from '../types.js';

// ── Types ──

export type SurgeLevel = 'watch' | 'elevated' | 'critical';

export interface SurgeAlert {
  baseId: string;
  baseName: string;
  lat: number;
  lng: number;
  level: SurgeLevel;
  currentCount: number;
  baselineMean: number;
  baselineStdDev: number;
  zScore: number;
  topCallsigns: string[];
  detectedAt: string;
}

// ── Haversine distance (km) ──

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Welford online algorithm for running mean/stddev ──

interface WelfordState {
  n: number;
  mean: number;
  m2: number;
}

function welfordUpdate(state: WelfordState, value: number): void {
  state.n++;
  const delta = value - state.mean;
  state.mean += delta / state.n;
  const delta2 = value - state.mean;
  state.m2 += delta * delta2;
}

function welfordStdDev(state: WelfordState): number {
  if (state.n < 2) return 0;
  return Math.sqrt(state.m2 / (state.n - 1));
}

// ── Baselines persisted to Redis ──

const PROXIMITY_KM = 150;
const MIN_OBSERVATIONS = 8;
const Z_WATCH = 2.0;
const Z_ELEVATED = 3.5;
const Z_CRITICAL = 4.0;
const REDIS_KEY = 'state:surgeBaselines';

let baselines: Record<string, WelfordState> = {};

async function loadBaselines(): Promise<void> {
  const saved = await redisGet<Record<string, WelfordState>>(REDIS_KEY).catch(() => null);
  if (saved && typeof saved === 'object') {
    baselines = saved;
    console.log(`[SURGE] Restored ${Object.keys(baselines).length} baselines from Redis`);
  }
}

async function saveBaselines(): Promise<void> {
  await redisSet(REDIS_KEY, baselines, 7 * 24 * 3600).catch(() => {});
}

// Load on startup
loadBaselines();

// ── Main detection ──

export async function detectSurges(): Promise<void> {
  console.log('[SURGE] Running surge detection...');

  // Get flights from cache
  const flights = cache.get<MilitaryFlight[]>('flights');
  if (!flights || flights.length === 0) {
    console.log('[SURGE] No flights data, skipping');
    return;
  }

  // Get bases from cache (GeoJSON FeatureCollection)
  const basesGeoJSON = cache.get<GeoJSON.FeatureCollection>('layer_bases');
  if (!basesGeoJSON || !basesGeoJSON.features?.length) {
    console.log('[SURGE] No bases data, skipping');
    return;
  }

  // Only count airborne flights
  const airborne = flights.filter(f => !f.on_ground);

  const alerts: SurgeAlert[] = [];

  for (const feature of basesGeoJSON.features) {
    const props = feature.properties as Record<string, unknown>;
    const coords = (feature.geometry as GeoJSON.Point).coordinates;
    if (!coords || coords.length < 2) continue;

    const baseLng = coords[0];
    const baseLat = coords[1];
    const baseName = (props.name as string) || 'Unknown Base';
    const baseId = `base_${baseLat.toFixed(2)}_${baseLng.toFixed(2)}`;

    // Count airborne flights within proximity
    const nearby: MilitaryFlight[] = [];
    for (const f of airborne) {
      if (haversineKm(baseLat, baseLng, f.lat, f.lng) <= PROXIMITY_KM) {
        nearby.push(f);
      }
    }

    const count = nearby.length;

    // Initialize baseline if missing
    if (!baselines[baseId]) {
      baselines[baseId] = { n: 0, mean: 0, m2: 0 };
    }

    const state = baselines[baseId];

    // Update baseline with current observation
    welfordUpdate(state, count);

    // Need enough observations before alerting
    if (state.n < MIN_OBSERVATIONS) continue;

    const stdDev = welfordStdDev(state);
    if (stdDev < 0.5) continue; // variance too low, no meaningful baseline

    const zScore = (count - state.mean) / stdDev;

    let level: SurgeLevel | null = null;
    if (zScore >= Z_CRITICAL) level = 'critical';
    else if (zScore >= Z_ELEVATED) level = 'elevated';
    else if (zScore >= Z_WATCH) level = 'watch';

    if (level) {
      alerts.push({
        baseId,
        baseName,
        lat: baseLat,
        lng: baseLng,
        level,
        currentCount: count,
        baselineMean: Math.round(state.mean * 10) / 10,
        baselineStdDev: Math.round(stdDev * 10) / 10,
        zScore: Math.round(zScore * 100) / 100,
        topCallsigns: nearby.slice(0, 5).map(f => f.callsign || f.icao24),
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by z-score descending
  alerts.sort((a, b) => b.zScore - a.zScore);

  cache.set('surge_alerts', alerts, 20 * 60_000); // 20 min TTL
  await saveBaselines();

  console.log(`[SURGE] ${alerts.length} surge alerts (${Object.keys(baselines).length} baselines tracked)`);
}
