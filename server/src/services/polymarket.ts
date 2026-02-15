import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  outcomes: string[];            // e.g. ['Yes', 'No']
  outcomePrices: number[];       // e.g. [0.72, 0.28] — probability as decimal
  volume: number;                // total volume in USD
  liquidity: number;
  active: boolean;
  closed: boolean;
  endDate: string | null;
  category: string;              // our classification
}

const MIN_VOLUME = 50000; // $50K minimum to filter noise

// Keywords to classify into our categories
const GEO_KW = /iran|china|russia|ukraine|taiwan|nato|nuclear|north korea|missile|sanction|israel|gaza|houthi|yemen|syria|hezbollah|india.pak|pakistan.india|south china sea|arctic|venezuela/i;
const US_KW = /trump|biden|harris|congress|senate|us election|us president|american|united states|gop|democrat|republican|border wall|immigration.*us|doj|fbi|cia|pentagon|white house|doge|rfk|jd vance|desantis/i;
const ECON_KW = /fed rate|federal reserve|interest rate|inflation|gdp|recession|bitcoin|btc|ethereum|crypto|s&p 500|nasdaq|dow jones|tariff|trade war|debt ceiling/i;
const CONFLICT_KW = /war\b|invasion|attack|strike|ceasefire|peace deal|troops deploy|military operation|casualties|bombing/i;

function classify(title: string): string {
  if (CONFLICT_KW.test(title)) return 'conflict';
  if (GEO_KW.test(title)) return 'geopolitical';
  if (US_KW.test(title)) return 'us_politics';
  if (ECON_KW.test(title)) return 'economic';
  return 'other';
}

export async function fetchPolymarket(): Promise<void> {
  console.log('[POLYMARKET] Fetching prediction markets...');

  try {
    const url = 'https://gamma-api.polymarket.com/markets?closed=false&limit=200&order=volume&ascending=false';

    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const markets = await res.json() as any[];

    const events: PolymarketEvent[] = markets
      .filter((m: any) => {
        const vol = parseFloat(m.volume ?? '0');
        return vol >= MIN_VOLUME && m.active && !m.closed;
      })
      .map((m: any) => {
        const outcomes = m.outcomes ?? '["Yes","No"]';
        const prices = m.outcomePrices ?? '["0.5","0.5"]';

        let parsedOutcomes: string[];
        let parsedPrices: number[];

        try {
          parsedOutcomes = typeof outcomes === 'string' ? JSON.parse(outcomes) : outcomes;
          parsedPrices = (typeof prices === 'string' ? JSON.parse(prices) : prices).map(Number);
        } catch {
          parsedOutcomes = ['Yes', 'No'];
          parsedPrices = [0.5, 0.5];
        }

        return {
          id: m.id ?? m.conditionId ?? '',
          title: m.question ?? m.title ?? '',
          slug: m.slug ?? '',
          outcomes: parsedOutcomes,
          outcomePrices: parsedPrices,
          volume: parseFloat(m.volume ?? '0'),
          liquidity: parseFloat(m.liquidity ?? '0'),
          active: !!m.active,
          closed: !!m.closed,
          endDate: m.endDateIso ?? null,
          category: classify(m.question ?? m.title ?? ''),
        };
      })
      .filter(e => {
        if (e.category !== 'other') return true;
        // Keep "other" if high volume — likely significant
        return e.volume >= 500_000;
      })
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 30);

    cache.set('polymarket', events, TTL.POLYMARKET);
    console.log(`[POLYMARKET] ${events.length} relevant markets cached`);
  } catch (err) {
    console.error('[POLYMARKET] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
