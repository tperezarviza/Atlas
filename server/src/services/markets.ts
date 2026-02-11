import { TWELVE_DATA_API_KEY, OIL_PRICE_API_KEY, METALS_API_KEY, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import { mockMarketSections } from '../mock/markets.js';
import type { MarketSection, MarketItem } from '../types.js';

// Generate simple spark data from current price (simulated 20-point series)
function generateSparkData(price: number, changePercent: number): number[] {
  const points: number[] = [];
  const base = price / (1 + changePercent / 100);
  for (let i = 0; i < 20; i++) {
    const progress = i / 19;
    const noise = (Math.random() - 0.5) * price * 0.02;
    points.push(Math.round(base + (price - base) * progress + noise));
  }
  return points;
}

function formatPrice(price: number, prefix = '$'): string {
  if (price >= 10000) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (price >= 100) return `${prefix}${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  return `${prefix}${price.toFixed(2)}`;
}

function formatDelta(change: number): { delta: string; direction: 'up' | 'down' | 'flat' } {
  if (Math.abs(change) < 0.05) return { delta: '▬ 0.0%', direction: 'flat' };
  if (change > 0) return { delta: `▲ +${change.toFixed(1)}%`, direction: 'up' };
  return { delta: `▼ ${change.toFixed(1)}%`, direction: 'down' };
}

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

async function fetchTwelveData(): Promise<Record<string, MarketItem>> {
  if (!TWELVE_DATA_API_KEY) {
    console.warn('[MARKETS] No TWELVE_DATA_API_KEY, skipping indices');
    return {};
  }

  const symbols = ['SPX', 'DJI', 'VIX', 'DXY'];
  const nameMap: Record<string, { name: string; color?: string }> = {
    SPX: { name: 'S&P 500', color: '#28b35a' },
    DJI: { name: 'DOW', color: '#28b35a' },
    VIX: { name: 'VIX', color: '#e83b3b' },
    DXY: { name: 'DXY' },
  };

  const items: Record<string, MarketItem> = {};

  for (const symbol of symbols) {
    try {
      // Use time_series for real sparkline data (20 data points)
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=20&apikey=${encodeURIComponent(TWELVE_DATA_API_KEY)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.code) continue; // API error

      const values: Array<{ close: string }> = data.values ?? [];
      if (values.length === 0) continue;

      const price = parseFloat(values[0].close);
      const prevPrice = values.length > 1 ? parseFloat(values[1].close) : price;
      const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
      const { delta, direction } = formatDelta(change);
      const info = nameMap[symbol] ?? { name: symbol };

      // Real sparkline: reverse so oldest is first
      const sparkData = values
        .map((v) => Math.round(parseFloat(v.close)))
        .reverse();

      items[symbol] = {
        name: info.name, price: formatPrice(price, symbol === 'DXY' ? '' : ''),
        delta, direction,
        sparkData,
        color: info.color,
      };
    } catch (err) {
      console.warn(`[MARKETS] TwelveData ${symbol} failed:`, err instanceof Error ? err.message : err);
    }
  }

  return items;
}

async function fetchOilPrices(): Promise<MarketItem[]> {
  if (!OIL_PRICE_API_KEY) {
    console.warn('[MARKETS] No OIL_PRICE_API_KEY, skipping oil prices');
    return [];
  }

  const items: MarketItem[] = [];
  try {
    const url = `https://api.oilpriceapi.com/v1/prices/latest?by_code=WTI_USD`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
      headers: { Authorization: `Token ${OIL_PRICE_API_KEY}` },
    });
    if (res.ok) {
      const data = await res.json();
      const price = data.data?.price ?? 0;
      if (price > 0) {
        const { delta, direction } = formatDelta(0); // No change data from basic endpoint
        items.push({
          name: 'WTI OIL', price: formatPrice(price), delta, direction,
          sparkData: generateSparkData(price, 0),
        });
      }
    }
  } catch (err) {
    console.warn('[MARKETS] OilPrice failed:', err instanceof Error ? err.message : err);
  }

  return items;
}

async function fetchMetals(): Promise<MarketItem[]> {
  if (!METALS_API_KEY) {
    console.warn('[MARKETS] No METALS_API_KEY, skipping metals');
    return [];
  }

  const items: MarketItem[] = [];
  try {
    const url = `https://metals-api.com/api/latest?access_key=${encodeURIComponent(METALS_API_KEY)}&base=USD&symbols=XAU,XAG`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (res.ok) {
      const data = await res.json();
      if (data.rates?.XAU) {
        const goldPrice = 1 / data.rates.XAU; // API gives USD per ounce inverted
        items.push({
          name: 'GOLD', price: formatPrice(goldPrice), delta: '▬ 0.0%', direction: 'flat',
          sparkData: generateSparkData(goldPrice, 0), color: '#d4a72c',
        });
      }
      if (data.rates?.XAG) {
        const silverPrice = 1 / data.rates.XAG;
        items.push({
          name: 'SILVER', price: formatPrice(silverPrice), delta: '▬ 0.0%', direction: 'flat',
          sparkData: generateSparkData(silverPrice, 0), color: '#94a3b8',
        });
      }
    }
  } catch (err) {
    console.warn('[MARKETS] Metals failed:', err instanceof Error ? err.message : err);
  }

  return items;
}

export async function fetchMarkets(): Promise<void> {
  console.log('[MARKETS] Fetching market data...');

  try {
    const [crypto, indices, oil, metals] = await Promise.allSettled([
      fetchCoinGecko(),
      fetchTwelveData(),
      fetchOilPrices(),
      fetchMetals(),
    ]);

    // Start from mock structure, override with real data where available
    const sections: MarketSection[] = JSON.parse(JSON.stringify(mockMarketSections));

    // Update crypto
    if (crypto.status === 'fulfilled' && crypto.value.length > 0) {
      const cryptoSection = sections.find((s) => s.title === 'Crypto');
      if (cryptoSection) {
        for (const item of crypto.value) {
          const idx = cryptoSection.items.findIndex((i) => i.name === item.name);
          if (idx >= 0) cryptoSection.items[idx] = item;
        }
      }
      console.log(`[MARKETS] CoinGecko: ${crypto.value.length} items`);
    }

    // Update indices
    if (indices.status === 'fulfilled') {
      const indexSection = sections.find((s) => s.title === 'Indices');
      if (indexSection) {
        const indMap = indices.value;
        for (const [, item] of Object.entries(indMap)) {
          const idx = indexSection.items.findIndex((i) => i.name === item.name);
          if (idx >= 0) indexSection.items[idx] = item;
        }
      }
      console.log(`[MARKETS] TwelveData: ${Object.keys(indices.value).length} items`);
    }

    // Update oil
    if (oil.status === 'fulfilled' && oil.value.length > 0) {
      const energySection = sections.find((s) => s.title === 'Energy');
      if (energySection) {
        for (const item of oil.value) {
          const idx = energySection.items.findIndex((i) => i.name === item.name);
          if (idx >= 0) energySection.items[idx] = item;
        }
      }
    }

    // Update metals
    if (metals.status === 'fulfilled' && metals.value.length > 0) {
      const metalsSection = sections.find((s) => s.title === 'Precious Metals');
      if (metalsSection) {
        for (const item of metals.value) {
          const idx = metalsSection.items.findIndex((i) => i.name === item.name);
          if (idx >= 0) metalsSection.items[idx] = item;
        }
      }
    }

    cache.set('markets', sections, TTL.MARKETS);
    console.log('[MARKETS] Market data cached');
  } catch (err) {
    console.error('[MARKETS] Fetch failed:', err);
  }
}
