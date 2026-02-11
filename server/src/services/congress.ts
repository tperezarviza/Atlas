import { CONGRESS_API_KEY, FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { CongressBill, SenateNomination, BillRelevance, BillStatus } from '../types.js';

const BASE = 'https://api.congress.gov/v3';

function classifyRelevance(title: string): BillRelevance {
  const t = title.toLowerCase();
  if (/defense|military|armed|pentagon|dod|veteran/.test(t)) return 'defense';
  if (/immigra|border|asylum|visa|daca|deport/.test(t)) return 'immigration';
  if (/foreign|diplomat|ambassador|treaty|sanction|nato/.test(t)) return 'foreign_affairs';
  if (/intelligen|surveil|cia|nsa|fisa|espionage/.test(t)) return 'intelligence';
  if (/tariff|trade|export|import|commerce|usmca/.test(t)) return 'trade';
  return 'other';
}

function classifyStatus(latestAction: string): BillStatus {
  const a = latestAction.toLowerCase();
  if (/signed|became public law/.test(a)) return 'signed';
  if (/vetoed/.test(a)) return 'vetoed';
  if (/passed senate|agreed to in senate/.test(a)) return 'passed_senate';
  if (/passed house|engrossed/.test(a)) return 'passed_house';
  if (/committee|referred/.test(a)) return 'committee';
  return 'introduced';
}

async function fetchBills(): Promise<void> {
  if (cache.isFresh('congress_bills')) return;

  if (!CONGRESS_API_KEY) {
    console.warn('[CONGRESS] No API key configured, skipping bills');
    return;
  }

  console.log('[CONGRESS] Fetching bills...');
  try {
    const url = `${BASE}/bill?api_key=${CONGRESS_API_KEY}&sort=updateDate+desc&limit=50&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) throw new Error(`Congress API ${res.status}`);

    const data = await res.json() as { bills?: any[] };
    const bills: CongressBill[] = (data.bills || [])
      .map((b: any) => {
        const typePrefix = (b.type || '').toUpperCase();
        const num = b.number || '';
        return {
          number: typePrefix && num ? `${typePrefix} ${num}` : b.billNumber || `${typePrefix}${num}`,
          title: b.title || '',
          sponsor: b.sponsors?.[0]?.fullName || b.sponsor?.fullName || '',
          party: b.sponsors?.[0]?.party || b.sponsor?.party || '',
          introduced_date: b.introducedDate || '',
          latest_action: b.latestAction?.text || '',
          latest_action_date: b.latestAction?.actionDate || '',
          status: classifyStatus(b.latestAction?.text || ''),
          subjects: [],
          committee: '',
          relevance: classifyRelevance(b.title || ''),
        } satisfies CongressBill;
      })
      .filter((b: CongressBill) => b.relevance !== 'other')
      .slice(0, 20);

    cache.set('congress_bills', bills, TTL.CONGRESS);
    console.log(`[CONGRESS] Cached ${bills.length} relevant bills`);
  } catch (err) {
    console.error('[CONGRESS] Bills fetch failed:', err instanceof Error ? err.message : err);
  }
}

async function fetchNominations(): Promise<void> {
  if (cache.isFresh('congress_nominations')) return;

  if (!CONGRESS_API_KEY) {
    console.warn('[CONGRESS] No API key configured, skipping nominations');
    return;
  }

  console.log('[CONGRESS] Fetching nominations...');
  try {
    const url = `${BASE}/nomination/119?api_key=${CONGRESS_API_KEY}&limit=20&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) throw new Error(`Congress API nominations ${res.status}`);

    const data = await res.json() as { nominations?: any[] };
    const nominations: SenateNomination[] = (data.nominations || [])
      .map((n: any) => {
        const actionText = (n.latestAction?.text || '').toLowerCase();
        let status: SenateNomination['status'] = 'pending';
        if (actionText.includes('confirmed')) status = 'confirmed';
        else if (actionText.includes('rejected')) status = 'rejected';
        else if (actionText.includes('withdrawn')) status = 'withdrawn';

        return {
          name: n.description || '',
          position: n.organization || '',
          agency: n.organization || '',
          status,
        } satisfies SenateNomination;
      })
      .slice(0, 20);

    cache.set('congress_nominations', nominations, TTL.CONGRESS);
    console.log(`[CONGRESS] Cached ${nominations.length} nominations`);
  } catch (err) {
    console.error('[CONGRESS] Nominations fetch failed:', err instanceof Error ? err.message : err);
  }
}

export async function fetchCongress(): Promise<void> {
  await fetchBills();
  await fetchNominations();
}
