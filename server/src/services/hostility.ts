import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { safeJson } from '../utils.js';
import type { HostilityPair, Severity } from '../types.js';

const HOSTILITY_PAIRS = [
  { id: 'hp-us-cn', countryA: 'United States', codeA: 'US', countryB: 'China', codeB: 'CN' },
  { id: 'hp-us-ru', countryA: 'United States', codeA: 'US', countryB: 'Russia', codeB: 'RU' },
  { id: 'hp-us-ir', countryA: 'United States', codeA: 'US', countryB: 'Iran', codeB: 'IR' },
  { id: 'hp-us-kp', countryA: 'United States', codeA: 'US', countryB: 'North Korea', codeB: 'KP' },
  { id: 'hp-il-ir', countryA: 'Israel', codeA: 'IL', countryB: 'Iran', codeB: 'IR' },
  { id: 'hp-in-pk', countryA: 'India', codeA: 'IN', countryB: 'Pakistan', codeB: 'PK' },
  { id: 'hp-in-cn', countryA: 'India', codeA: 'IN', countryB: 'China', codeB: 'CN' },
  { id: 'hp-cn-tw', countryA: 'China', codeA: 'CN', countryB: 'Taiwan', codeB: 'TW' },
  { id: 'hp-sa-ir', countryA: 'Saudi Arabia', codeA: 'SA', countryB: 'Iran', codeB: 'IR' },
  { id: 'hp-ru-ua', countryA: 'Russia', codeA: 'RU', countryB: 'Ukraine', codeB: 'UA' },
  { id: 'hp-tr-gr', countryA: 'Turkey', codeA: 'TR', countryB: 'Greece', codeB: 'GR' },
  { id: 'hp-jp-cn', countryA: 'Japan', codeA: 'JP', countryB: 'China', codeB: 'CN' },
  { id: 'hp-kr-kp', countryA: 'South Korea', codeA: 'KR', countryB: 'North Korea', codeB: 'KP' },
  { id: 'hp-am-az', countryA: 'Armenia', codeA: 'AM', countryB: 'Azerbaijan', codeB: 'AZ' },
  { id: 'hp-rs-xk', countryA: 'Serbia', codeA: 'RS', countryB: 'Kosovo', codeB: 'XK' },
] as const;

function classifyTone(tone: number): Severity {
  if (tone < -5) return 'critical';
  if (tone < -3) return 'high';
  if (tone < -1) return 'medium';
  return 'low';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchHostilityIndex(): Promise<void> {
  console.log('[HOSTILITY] Fetching hostility index for 15 country pairs...');

  try {
    const pairs: HostilityPair[] = [];

    for (const pair of HOSTILITY_PAIRS) {
      try {
        const query = encodeURIComponent(`(${pair.countryA} AND ${pair.countryB})`);
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=tonechart&format=json&timespan=7d`;

        const res = await fetch(url, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
          headers: { 'User-Agent': 'ATLAS/1.0' },
        });

        if (!res.ok) {
          console.warn(`[HOSTILITY] GDELT ${pair.id}: ${res.status}`);
          await delay(1500);
          continue;
        }

        const json = await safeJson<Record<string, unknown>>(res);
        const toneData: { date: string; tone: number; count?: number }[] = (json.tonechart ?? []) as { date: string; tone: number; count?: number }[];

        if (toneData.length === 0) {
          await delay(1500);
          continue;
        }

        const totalTone = toneData.reduce((sum, d) => sum + d.tone, 0);
        const totalCount = toneData.reduce((sum, d) => sum + (d.count ?? 1), 0);
        const avgTone = totalTone / toneData.length;

        // Rate limit between GDELT requests
        await delay(1500);

        // Get top headlines
        const headlineUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=5&format=json&timespan=7d`;
        let topHeadlines: string[] = [];

        try {
          const hRes = await fetch(headlineUrl, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
            headers: { 'User-Agent': 'ATLAS/1.0' },
          });
          if (hRes.ok) {
            const hJson = await safeJson<Record<string, unknown>>(hRes);
            topHeadlines = ((hJson.articles ?? []) as { title?: string }[])
              .slice(0, 3)
              .map((a: { title?: string }) => a.title ?? '')
              .filter(Boolean);
          }
        } catch {
          // Headlines are optional
        }

        pairs.push({
          id: pair.id,
          countryA: pair.countryA,
          codeA: pair.codeA,
          countryB: pair.countryB,
          codeB: pair.codeB,
          avgTone: Math.round(avgTone * 100) / 100,
          articleCount: totalCount,
          trend: classifyTone(avgTone),
          topHeadlines,
        });
      } catch (err) {
        console.warn(`[HOSTILITY] ${pair.id} failed:`, err instanceof Error ? err.message : err);
      }

      // Rate limit: 1.5s between requests
      await delay(1500);
    }

    if (pairs.length > 0) {
      cache.set('hostility', pairs, TTL.HOSTILITY);
      console.log(`[HOSTILITY] ${pairs.length} hostility pairs cached`);
    } else {
      console.warn('[HOSTILITY] No pairs fetched, keeping cache/mock');
    }
  } catch (err) {
    console.error('[HOSTILITY] Fetch failed:', err);
  }
}
