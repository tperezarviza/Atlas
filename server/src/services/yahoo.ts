import { FETCH_TIMEOUT_API } from '../config.js';
import type { MarketItem } from '../types.js';

const YAHOO_MAP: Record<string, string> = {
  // US Majors
  'SPX':        '^GSPC',
  'DJI':        '^DJI',
  'IXIC':       '^IXIC',
  'RUT':        '^RUT',
  // LatAm
  'IBOV':       '^BVSP',
  'MERV':       '^MERV',
  'MXX':        '^MXX',
  // Europe
  'FTSE':       '^FTSE',
  'DAX':        '^GDAXI',
  'CAC':        '^FCHI',
  'IBEX':       '^IBEX',
  'FTSEMIB':    'FTSEMIB.MI',
  'MOEX':       'IMOEX.ME',
  // Asia-Pacific
  'NI225':      '^N225',
  'HSI':        '^HSI',
  '000001.SS':  '000001.SS',
  '399001.SZ':  '399001.SZ',
  'KOSPI':      '^KS11',
  'XJO':        '^AXJO',
  'SENSEX':     '^BSESN',
  'NIFTY50':    '^NSEI',
  'TAIEX':      '^TWII',
  // Middle East/Africa
  'TASI':       '^TASI.SR',
  'TA35':       '^TA125.TA',
  'EGX30':      '^CASE30',
  // Forex (PAIR → PAIRNOPREFIX=X)
  'EUR/USD':    'EURUSD=X',
  'GBP/USD':    'GBPUSD=X',
  'USD/JPY':    'USDJPY=X',
  'USD/CHF':    'USDCHF=X',
  'AUD/USD':    'AUDUSD=X',
  'USD/CAD':    'USDCAD=X',
  'USD/CNY':    'USDCNY=X',
  'USD/RUB':    'USDRUB=X',
  'USD/TRY':    'USDTRY=X',
  'USD/ARS':    'USDARS=X',
  'USD/BRL':    'USDBRL=X',
  'USD/MXN':    'USDMXN=X',
  'USD/UAH':    'USDUAH=X',
  'USD/ILS':    'USDILS=X',
  'USD/IRR':    'USDIRR=X',
  'EUR/CHF':    'EURCHF=X',
  // Commodities
  'GC=F':       'GC=F',
  'SI=F':       'SI=F',
};

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

function formatPrice(price: number): string {
  if (price >= 10000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 100) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 10) return price.toFixed(2);
  return price.toFixed(4);
}

function formatDelta(change: number): { delta: string; direction: 'up' | 'down' | 'flat' } {
  if (Math.abs(change) < 0.05) return { delta: '▬ 0.0%', direction: 'flat' };
  if (change > 0) return { delta: `▲ +${change.toFixed(1)}%`, direction: 'up' };
  return { delta: `▼ ${change.toFixed(1)}%`, direction: 'down' };
}

async function fetchYahooSymbol(internalSymbol: string): Promise<MarketItem | null> {
  const yahooSymbol = YAHOO_MAP[internalSymbol] ?? internalSymbol;
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?range=1mo&interval=1d`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const result = data.chart?.result?.[0];
    if (!result) return null;

    const closes: (number | null)[] = result.indicators?.quote?.[0]?.close ?? [];
    const validCloses = closes.filter((c): c is number => c != null && !isNaN(c));
    if (validCloses.length === 0) return null;

    const last20 = validCloses.slice(-20);
    const price = last20[last20.length - 1];
    const prevPrice = last20.length > 1 ? last20[last20.length - 2] : price;
    const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
    const { delta, direction } = formatDelta(change);

    return {
      name: internalSymbol,
      price: formatPrice(price),
      delta,
      direction,
      sparkData: normalizeSparkData(last20),
    };
  } catch {
    return null;
  }
}

export async function fetchYahooBatch(symbols: string[]): Promise<Record<string, MarketItem>> {
  const results: Record<string, MarketItem> = {};

  for (const symbol of symbols) {
    try {
      const item = await fetchYahooSymbol(symbol);
      if (item) results[symbol] = item;
    } catch {
      // skip failed symbol
    }
    // Delay between requests to avoid Yahoo 429 rate limiting
    if (symbols.indexOf(symbol) < symbols.length - 1) {
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  return results;
}
