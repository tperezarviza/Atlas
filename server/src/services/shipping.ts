import { TTL, GDELT_BASE } from '../config.js';
import { cache } from '../cache.js';
import { safeJson } from '../utils.js';
import type { Chokepoint, ChokepointStatus } from '../types.js';

const GDELT_TIMEOUT = 30_000; // GDELT via CF proxy needs ~20-25s

const CHOKEPOINTS_BASE: Omit<Chokepoint, 'status' | 'statusReason' | 'nearbyVessels' | 'recentIncidents'>[] = [
  { id: 'cp-hormuz', name: 'Strait of Hormuz', lat: 26.56, lng: 56.25, region: 'Middle East', dailyVessels: 80, oilFlowMbpd: 21.0, globalTradePercent: 21 },
  { id: 'cp-bab', name: 'Bab el-Mandeb', lat: 12.58, lng: 43.33, region: 'Red Sea', dailyVessels: 55, oilFlowMbpd: 6.2, globalTradePercent: 12 },
  { id: 'cp-suez', name: 'Suez Canal', lat: 30.46, lng: 32.34, region: 'Middle East', dailyVessels: 50, oilFlowMbpd: 5.5, globalTradePercent: 12 },
  { id: 'cp-malacca', name: 'Strait of Malacca', lat: 2.5, lng: 101.5, region: 'Southeast Asia', dailyVessels: 90, oilFlowMbpd: 16.0, globalTradePercent: 25 },
  { id: 'cp-bosphorus', name: 'Turkish Straits (Bosphorus)', lat: 41.12, lng: 29.06, region: 'Eastern Mediterranean', dailyVessels: 45, oilFlowMbpd: 3.0, globalTradePercent: 5 },
  { id: 'cp-panama', name: 'Panama Canal', lat: 9.08, lng: -79.68, region: 'Central America', dailyVessels: 38, oilFlowMbpd: 1.0, globalTradePercent: 5 },
  { id: 'cp-cape', name: 'Cape of Good Hope', lat: -34.35, lng: 18.47, region: 'Southern Africa', dailyVessels: 30, oilFlowMbpd: 6.0, globalTradePercent: 9 },
  { id: 'cp-taiwan', name: 'Taiwan Strait', lat: 24.0, lng: 119.5, region: 'East Asia', dailyVessels: 240, oilFlowMbpd: 5.3, globalTradePercent: 10 },
  { id: 'cp-giuk', name: 'GIUK Gap', lat: 62.0, lng: -15.0, region: 'North Atlantic', dailyVessels: 20, oilFlowMbpd: 0.5, globalTradePercent: 3 },
];

function classifyStatus(tone: number, count: number): { status: ChokepointStatus; reason?: string } {
  if (tone < -7 && count > 3) return { status: 'critical', reason: 'Severe disruption reported in media' };
  if (tone < -5) return { status: 'disrupted', reason: 'Significant incidents reported' };
  if (tone < -3) return { status: 'elevated', reason: 'Increased tensions in region' };
  return { status: 'normal' };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchShippingData(): Promise<void> {
  console.log('[SHIPPING] Enriching chokepoint status via GDELT...');

  try {
    const chokepoints: Chokepoint[] = [];

    for (const cp of CHOKEPOINTS_BASE) {
      let status: ChokepointStatus = 'normal';
      let statusReason: string | undefined;
      let recentIncidents: string[] = [];

      try {
        const keywords = encodeURIComponent(`"${cp.name}" (attack OR disruption OR closure OR blockade OR missile)`);
        const url = `${GDELT_BASE}/api/v2/doc/doc?query=${keywords}&mode=tonechart&format=json&timespan=7d`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(GDELT_TIMEOUT),
          headers: { 'User-Agent': 'ATLAS/1.0' },
        });

        if (res.ok) {
          const json = await safeJson<Record<string, unknown>>(res);
          const toneData: { date: string; tone: number; count?: number }[] = (json.tonechart ?? []) as { date: string; tone: number; count?: number }[];

          if (toneData.length > 0) {
            const avgTone = toneData.reduce((s, d) => s + d.tone, 0) / toneData.length;
            const totalCount = toneData.reduce((s, d) => s + (d.count ?? 1), 0);
            const result = classifyStatus(avgTone, totalCount);
            status = result.status;
            statusReason = result.reason;
          }

          // Rate limit between GDELT requests
          await delay(1500);

          // Fetch recent headlines
          const headlineQuery = encodeURIComponent(`"${cp.name}" (incident OR attack OR disruption)`);
          const hUrl = `${GDELT_BASE}/api/v2/doc/doc?query=${headlineQuery}&mode=artlist&maxrecords=3&format=json&timespan=7d`;

          try {
            const hRes = await fetch(hUrl, {
              signal: AbortSignal.timeout(GDELT_TIMEOUT),
              headers: { 'User-Agent': 'ATLAS/1.0' },
            });
            if (hRes.ok) {
              const hJson = await safeJson<Record<string, unknown>>(hRes);
              recentIncidents = ((hJson.articles ?? []) as { title?: string }[])
                .slice(0, 3)
                .map((a: { title?: string }) => a.title ?? '')
                .filter(Boolean);
            }
          } catch {
            // Headlines optional
          }
        }
      } catch (err) {
        console.warn(`[SHIPPING] ${cp.name} GDELT failed:`, err instanceof Error ? err.message : err);
      }

      chokepoints.push({
        ...cp,
        status,
        statusReason,
        nearbyVessels: null,
        recentIncidents,
      });

      await delay(1500);
    }

    cache.set('shipping', chokepoints, TTL.SHIPPING);
    console.log(`[SHIPPING] ${chokepoints.length} chokepoints cached`);
  } catch (err) {
    console.error('[SHIPPING] Fetch failed:', err);
  }
}
