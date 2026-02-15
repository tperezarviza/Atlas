import { TTL } from '../config.js';
import { cache } from '../cache.js';
import { translateTexts } from './translate.js';
import { withCircuitBreaker } from '../utils/circuit-breaker.js';
import { isBigQueryAvailable } from './bigquery.js';
import { fetchHostilityBQ } from './hostility-bq.js';
import type { HostilityPair, Severity } from '../types.js';

const GDELT_TIMEOUT = 25_000;  // GDELT is slow — 25s timeout
const PAIR_DELAY   = 3_000;    // 3s between pairs to avoid 429

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
  if (isBigQueryAvailable()) {
    return fetchHostilityBQ();
  }
  console.log('[HOSTILITY] Fetching hostility index for 15 country pairs...');

  try {
    const pairs: HostilityPair[] = [];

    const wrapIfNeeded = (name: string) => name.includes(' ') ? `"${name}"` : name;

    for (const pair of HOSTILITY_PAIRS) {
      try {
        const fetchToneData = async (): Promise<string> => {
          const query = encodeURIComponent(`${wrapIfNeeded(pair.countryA)} ${wrapIfNeeded(pair.countryB)}`);
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=tonechart&format=json&timespan=7d`;

          const res = await fetch(url, {
            signal: AbortSignal.timeout(GDELT_TIMEOUT),
            headers: { 'User-Agent': 'ATLAS/1.0' },
          });

          if (!res.ok) throw new Error(`GDELT ${pair.id}: ${res.status}`);

          let text = await res.text();

          if (!text.startsWith('{') && !text.startsWith('[')) {
            const fallbackQuery = encodeURIComponent(`${pair.countryA} ${pair.countryB}`);
            const fallbackUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${fallbackQuery}&mode=tonechart&format=json&timespan=7d`;
            const fallbackRes = await fetch(fallbackUrl, {
              signal: AbortSignal.timeout(GDELT_TIMEOUT),
              headers: { 'User-Agent': 'ATLAS/1.0' },
            });
            if (fallbackRes.ok) text = await fallbackRes.text();
            if (!text.startsWith('{') && !text.startsWith('[')) throw new Error(`GDELT ${pair.id}: non-JSON`);
          }

          return text;
        };

        let text: string;
        try {
          text = await withCircuitBreaker(`gdelt-hostility`, fetchToneData);
        } catch {
          console.warn(`[HOSTILITY] GDELT ${pair.id}: circuit breaker or fetch failed`);
          await delay(PAIR_DELAY);
          continue;
        }

        const json = JSON.parse(text) as Record<string, unknown>;
        const toneData = (json.tonechart ?? []) as { bin: number; count: number }[];

        if (toneData.length === 0) {
          await delay(PAIR_DELAY);
          continue;
        }

        const totalWeightedTone = toneData.reduce((sum, d) => sum + d.bin * d.count, 0);
        const totalCount = toneData.reduce((sum, d) => sum + d.count, 0);
        const avgTone = totalCount > 0 ? totalWeightedTone / totalCount : 0;

        // Rate limit between GDELT requests
        await delay(PAIR_DELAY);

        // Get top headlines
        let headlineQuery = encodeURIComponent(`${wrapIfNeeded(pair.countryA)} ${wrapIfNeeded(pair.countryB)}`);
        const headlineUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${headlineQuery}&mode=artlist&maxrecords=5&format=json&timespan=7d`;
        let topHeadlines: string[] = [];

        try {
          const hRes = await fetch(headlineUrl, {
            signal: AbortSignal.timeout(GDELT_TIMEOUT),
            headers: { 'User-Agent': 'ATLAS/1.0' },
          });
          if (hRes.ok) {
            let hText = await hRes.text();
            // Fallback for headlines too
            if (!hText.startsWith('{') && !hText.startsWith('[')) {
              const hFallbackQuery = encodeURIComponent(`${pair.countryA} ${pair.countryB}`);
              const hFallbackUrl = `https://api.gdeltproject.org/api/v2/doc/doc?query=${hFallbackQuery}&mode=artlist&maxrecords=5&format=json&timespan=7d`;
              const hFallbackRes = await fetch(hFallbackUrl, {
                signal: AbortSignal.timeout(GDELT_TIMEOUT),
                headers: { 'User-Agent': 'ATLAS/1.0' },
              });
              if (hFallbackRes.ok) hText = await hFallbackRes.text();
            }
            if (!hText.startsWith('{') && !hText.startsWith('[')) throw new Error('non-JSON');
            const hJson = JSON.parse(hText) as Record<string, unknown>;
            topHeadlines = ((hJson.articles ?? []) as { title?: string }[])
              .slice(0, 3)
              .map((a: { title?: string }) => a.title ?? '')
              .filter(Boolean);
          }
        } catch {
          // Headlines are optional
        }

        // Translate non-English headlines
        if (topHeadlines.length > 0) {
          topHeadlines = await translateTexts(topHeadlines, 'HOSTILITY');
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

      // Rate limit between pairs
      await delay(PAIR_DELAY);
    }

    if (pairs.length > 0) {
      await cache.setWithRedis('hostility', pairs, TTL.HOSTILITY, 12 * 3600);
      console.log(`[HOSTILITY] ${pairs.length} hostility pairs cached`);
    } else {
      console.warn('[HOSTILITY] No pairs fetched, keeping cache/mock');
    }
  } catch (err) {
    console.error('[HOSTILITY] Fetch failed:', err);
  }
}
