import { EIA_API_KEY, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { INDEX_SYMBOLS, FOREX_SYMBOLS, ALWAYS_FETCH, type SymbolDef } from '../data/symbols.js';
import { getActiveRegions } from './sessions.js';
import { fetchYahooBatch } from './yahoo.js';
import type { MarketSection, MarketItem } from '../types.js';

// ── Helpers ────────────────────────────────────────────────────

/** Normalize raw price array to 10-95 range for sparkline rendering */
function normalizeSparkData(values: number[]): number[] {
  if (values.length === 0) return [];
  const valid = values.filter((v) => v != null && !isNaN(v));
  if (valid.length === 0) return values.map(() => 50);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  return values.map((v) => {
    if (v == null || isNaN(v)) return 50;
    return Math.round(10 + ((v - min) / range) * 80);
  });
}

function generateSparkData(price: number, changePercent: number): number[] {
  const points: number[] = [];
  const base = price / (1 + changePercent / 100);
  for (let i = 0; i < 20; i++) {
    const progress = i / 19;
    const noise = (Math.random() - 0.5) * price * 0.02;
    points.push(base + (price - base) * progress + noise);
  }
  return normalizeSparkData(points);
}

function formatPrice(price: number, prefix = '$'): string {
  if (price >= 1_000_000) return `${prefix}${(price / 1000).toLocaleString('en-US', { maximumFractionDigits: 0 })}k`;
  if (price >= 10000) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 10) return `${prefix}${price.toFixed(2)}`;
  return `${prefix}${price.toFixed(4)}`;
}

function formatDelta(change: number): { delta: string; direction: 'up' | 'down' | 'flat' } {
  if (Math.abs(change) < 0.05) return { delta: '▬ 0.0%', direction: 'flat' };
  if (change > 0) return { delta: `▲ +${change.toFixed(1)}%`, direction: 'up' };
  return { delta: `▼ ${change.toFixed(1)}%`, direction: 'down' };
}

// ── Data Source Fetchers ───────────────────────────────────────

async function fetchCoinGecko(): Promise<MarketItem[]> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true';
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
  const data = await res.json();

  const items: MarketItem[] = [];

  if (data.bitcoin) {
    const price = data.bitcoin.usd;
    const change = data.bitcoin.usd_24h_change ?? 0;
    const { delta, direction } = formatDelta(change);
    items.push({
      name: 'BITCOIN', price: formatPrice(price), delta, direction,
      sparkData: generateSparkData(price, change), color: '#e8842b',
    });
  }

  if (data.ethereum) {
    const price = data.ethereum.usd;
    const change = data.ethereum.usd_24h_change ?? 0;
    const { delta, direction } = formatDelta(change);
    items.push({
      name: 'ETHEREUM', price: formatPrice(price), delta, direction,
      sparkData: generateSparkData(price, change), color: '#9b59e8',
    });
  }

  return items;
}

// ── Smart Refresh: Determine which symbols need updating ──────

const ACTIVE_REFRESH_MS = 5 * 60 * 1000;   // 5 min for open sessions
const STALE_REFRESH_MS = 30 * 60 * 1000;   // 30 min for closed sessions

function getSymbolsToFetch(): SymbolDef[] {
  const activeRegions = getActiveRegions();
  const allSymbols = [...INDEX_SYMBOLS, ...FOREX_SYMBOLS];

  const toFetch: SymbolDef[] = [];

  for (const sym of allSymbols) {
    const cacheKey = `mkt:${sym.symbol}`;
    const age = cache.age(cacheKey);

    const isActive =
      activeRegions.includes(sym.region) ||
      ALWAYS_FETCH.includes(sym.symbol) ||
      sym.section.startsWith('Forex'); // Forex is 24h

    const refreshInterval = isActive ? ACTIVE_REFRESH_MS : STALE_REFRESH_MS;

    if (age === null || age > refreshInterval) {
      toFetch.push(sym);
    }
  }

  return toFetch;
}

// ── Oil & Metals (unchanged logic, normalized spark) ──────────

async function fetchOilPrices(): Promise<MarketItem[]> {
  if (!EIA_API_KEY) {
    console.warn('[MARKETS] No EIA_API_KEY, skipping oil prices');
    return [];
  }

  const items: MarketItem[] = [];
  try {
    const url = `https://api.eia.gov/v2/petroleum/pri/spt/data/?api_key=${encodeURIComponent(EIA_API_KEY)}&data[]=value&facets[series][]=RWTC&frequency=daily&sort[0][column]=period&sort[0][direction]=desc&length=2`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (res.ok) {
      const data = await res.json();
      const rows = data.response?.data;
      if (rows && rows.length > 0) {
        const price = parseFloat(rows[0].value);
        const prevPrice = rows.length > 1 ? parseFloat(rows[1].value) : price;
        const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
        if (price > 0) {
          const { delta, direction } = formatDelta(change);
          items.push({
            name: 'WTI OIL', price: formatPrice(price), delta, direction,
            sparkData: generateSparkData(price, change),
          });
        }
      }
    }
  } catch (err) {
    console.warn('[MARKETS] EIA oil failed:', err instanceof Error ? err.message : err);
  }

  return items;
}

async function fetchMetals(): Promise<MarketItem[]> {
  const metalSymbols = [
    { symbol: 'GC=F', name: 'GOLD', color: '#d4a72c' },
    { symbol: 'SI=F', name: 'SILVER', color: '#c8a020' },
  ];

  const results = await fetchYahooBatch(metalSymbols.map(m => m.symbol));
  const items: MarketItem[] = [];

  for (const metal of metalSymbols) {
    const item = results[metal.symbol];
    if (item) {
      item.name = metal.name;
      item.color = metal.color;
      items.push(item);
    }
  }

  return items;
}

// ── Section Builders ───────────────────────────────────────────

function buildRegionalSections(allItems: Record<string, MarketItem>): MarketSection[] {
  const regions: Array<{ title: string; icon: string; section: string }> = [
    { title: 'Americas', icon: '🌎', section: 'Americas' },
    { title: 'Europe', icon: '🌍', section: 'Europe' },
    { title: 'Asia-Pacific', icon: '🌏', section: 'Asia-Pacific' },
    { title: 'Middle East/Africa', icon: '🕌', section: 'Middle East/Africa' },
  ];

  return regions.map((r) => {
    const syms = INDEX_SYMBOLS.filter((s) => s.section === r.section);
    const items = syms
      .map((s) => allItems[s.symbol] ?? cache.get<MarketItem>(`mkt:${s.symbol}`))
      .filter((item): item is MarketItem => item != null);
    return { title: r.title, icon: r.icon, items };
  }).filter((s) => s.items.length > 0);
}

function buildForexSections(allItems: Record<string, MarketItem>): MarketSection[] {
  const groups: Array<{ title: string; icon: string; section: string }> = [
    { title: 'Forex Major', icon: '💱', section: 'Forex Major' },
    { title: 'Forex Geopolitical', icon: '🏛️', section: 'Forex Geopolitical' },
  ];

  return groups.map((g) => {
    const syms = FOREX_SYMBOLS.filter((s) => s.section === g.section);
    const items = syms
      .map((s) => allItems[s.symbol] ?? cache.get<MarketItem>(`mkt:${s.symbol}`))
      .filter((item): item is MarketItem => item != null);
    return { title: g.title, icon: g.icon, items };
  }).filter((s) => s.items.length > 0);
}

// ── Main Orchestrator ──────────────────────────────────────────

export async function fetchMarkets(): Promise<void> {
  console.log('[MARKETS] Fetching market data...');

  try {
    // 1. Determine which symbols need refresh (session-aware)
    const symbolsToFetch = getSymbolsToFetch();
    console.log(`[MARKETS] Refreshing ${symbolsToFetch.length} Yahoo symbols`);

    // 2. Fetch all sources in parallel
    const [crypto, yahooResults, oil, metals] = await Promise.allSettled([
      fetchCoinGecko(),
      fetchYahooBatch(symbolsToFetch.map((s) => s.symbol)),
      fetchOilPrices(),
      fetchMetals(),
    ]);

    // 3. Merge fresh data into a unified map
    const allItems: Record<string, MarketItem> = {};

    // Load from individual symbol caches first (stale but available)
    for (const sym of [...INDEX_SYMBOLS, ...FOREX_SYMBOLS]) {
      const cached = cache.get<MarketItem>(`mkt:${sym.symbol}`);
      if (cached) allItems[sym.symbol] = cached;
    }

    // Override with fresh Yahoo
    if (yahooResults.status === 'fulfilled') {
      // Apply symbol metadata from registry
      for (const [symbol, item] of Object.entries(yahooResults.value)) {
        const symDef = [...INDEX_SYMBOLS, ...FOREX_SYMBOLS].find((s) => s.symbol === symbol);
        if (symDef) {
          item.name = symDef.name;
          item.color = symDef.color;
        }
        allItems[symbol] = item;
        cache.set(`mkt:${symbol}`, item, 30 * 60 * 1000);
      }
      console.log(`[MARKETS] Yahoo: ${Object.keys(yahooResults.value).length} items`);
    }

    // 4. Build commodity sections from real data only
    const commoditySections: MarketSection[] = [];

    const oilItems = oil.status === 'fulfilled' ? oil.value : [];
    if (oilItems.length > 0) {
      commoditySections.push({ title: 'Energy', icon: '⛽', items: oilItems });
    }

    const metalItems = metals.status === 'fulfilled' ? metals.value : [];
    if (metalItems.length > 0) {
      commoditySections.push({ title: 'Precious Metals', icon: '🥇', items: metalItems });
    }

    const cryptoItems = crypto.status === 'fulfilled' ? crypto.value : [];
    if (cryptoItems.length > 0) {
      commoditySections.push({ title: 'Crypto', icon: '₿', items: cryptoItems });
      console.log(`[MARKETS] CoinGecko: ${cryptoItems.length} items`);
    }

    // 5. Build regional index sections from Yahoo data
    const regionalSections = buildRegionalSections(allItems);
    const finalSections = [...regionalSections, ...commoditySections];

    // 6. Build forex sections
    const forexSections = buildForexSections(allItems);

    // 7. Cache everything (only if we have data)
    if (finalSections.length > 0) {
      cache.set('markets', finalSections, TTL.MARKETS);
    }
    if (forexSections.length > 0) {
      cache.set('forex', forexSections, TTL.FOREX);
    }
    console.log(`[MARKETS] Cached: ${finalSections.length} sections, ${forexSections.length} forex sections`);
  } catch (err) {
    console.error('[MARKETS] Fetch failed:', err);
  }
}
