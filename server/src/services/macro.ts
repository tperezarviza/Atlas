import { FRED_API_KEY, FETCH_TIMEOUT_API, FETCH_TIMEOUT_RSS, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { MacroItem } from '../types.js';

async function fetchFredSeries(seriesId: string): Promise<string | null> {
  if (!FRED_API_KEY) return null;

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${encodeURIComponent(seriesId)}&api_key=${encodeURIComponent(FRED_API_KEY)}&file_type=json&sort_order=desc&limit=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) return null;
    const data = await res.json();
    return data.observations?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function fetchNationalDebt(): Promise<string | null> {
  try {
    const url = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1';
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) return null;
    const data = await res.json();
    const debtStr = data.data?.[0]?.tot_pub_debt_out_amt;
    if (!debtStr) return null;
    const debt = parseFloat(debtStr);
    return `$${(debt / 1e12).toFixed(2)} T`;
  } catch {
    return null;
  }
}

async function fetchBLSSeries(seriesId: string): Promise<string | null> {
  try {
    const currentYear = new Date().getFullYear();
    const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
    const body = JSON.stringify({
      seriesid: [seriesId],
      startyear: String(currentYear - 1),
      endyear: String(currentYear),
    });
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_API),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.Results?.series?.[0]?.data?.[0]?.value ?? null;
  } catch {
    return null;
  }
}

/** Try to scrape DOGE savings from doge.gov or related RSS */
async function fetchDogeSavings(): Promise<string | null> {
  const urls = [
    'https://www.doge.gov/',
    'https://www.doge.gov/savings',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_RSS),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Look for dollar amount patterns like "$172B" or "$172 billion" or "$172,000,000,000"
      const patterns = [
        /\$[\d,.]+\s*[TB](?:illion)?/i,
        /saved[^$]*\$([\d,.]+\s*[TB](?:illion)?)/i,
        /savings[^$]*\$([\d,.]+\s*[TB](?:illion)?)/i,
        /total[^$]*\$([\d,.]+\s*[TB](?:illion)?)/i,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          return match[0].startsWith('$') ? match[0] : `$${match[1]}`;
        }
      }
    } catch {
      continue;
    }
  }

  return null;
}

export async function fetchMacro(): Promise<void> {
  console.log('[MACRO] Fetching macro indicators...');

  try {
    const [debt, fedRate, cpi, unemployment, doge] = await Promise.allSettled([
      fetchNationalDebt(),
      fetchFredSeries('FEDFUNDS'),
      fetchBLSSeries('CUSR0000SA0'), // CPI All Urban Consumers
      fetchBLSSeries('LNS14000000'), // Unemployment Rate
      fetchDogeSavings(),
    ]);

    const items: MacroItem[] = [];

    // National Debt
    const debtVal = debt.status === 'fulfilled' ? debt.value : null;
    items.push({ label: 'National Debt', value: debtVal ?? '$36.42 T', color: '#e83b3b' });

    // DOGE Savings — try live data, fallback to "N/A (no source)"
    const dogeVal = doge.status === 'fulfilled' ? doge.value : null;
    items.push({
      label: 'DOGE Savings',
      value: dogeVal ?? 'N/A (est.)',
      color: '#28b35a',
    });

    // Fed Rate
    const rateVal = fedRate.status === 'fulfilled' ? fedRate.value : null;
    items.push({ label: 'Fed Rate', value: rateVal ? `${rateVal}%` : '4.25-4.50%' });

    // CPI
    const cpiVal = cpi.status === 'fulfilled' ? cpi.value : null;
    items.push({ label: 'CPI (YoY)', value: cpiVal ? `${cpiVal}%` : '2.9%' });

    // Unemployment
    const unemplVal = unemployment.status === 'fulfilled' ? unemployment.value : null;
    items.push({ label: 'Unemployment', value: unemplVal ? `${unemplVal}%` : '4.0%' });

    cache.set('macro', items, TTL.MACRO);
    console.log('[MACRO] Macro data cached');
  } catch (err) {
    console.error('[MACRO] Fetch failed:', err);
  }
}
