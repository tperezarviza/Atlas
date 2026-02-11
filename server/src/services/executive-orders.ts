import { FETCH_TIMEOUT_API, TTL } from '../config.js';
import { cache } from '../cache.js';
import type { ExecutiveOrder } from '../types.js';

const BASE = 'https://www.federalregister.gov/api/v1';

function classifyTopics(title: string): string[] {
  const t = title.toLowerCase();
  const topics: string[] = [];
  if (/immigra|border|asylum|visa|deport|alien/.test(t)) topics.push('immigration');
  if (/tariff|trade|import|export|commerce|reciprocal/.test(t)) topics.push('trade');
  if (/defense|military|armed|pentagon|troops/.test(t)) topics.push('defense');
  if (/energy|oil|gas|drill|pipeline|lng|coal|nuclear/.test(t)) topics.push('energy');
  if (/regulat|deregulat|red tape|epa|agency/.test(t)) topics.push('deregulation');
  if (/tech|ai|artificial|cyber|tiktok|digital/.test(t)) topics.push('tech');
  if (/china|russia|iran|north korea|cuba|venezuel/.test(t)) topics.push('foreign_policy');
  if (/health|fda|vaccine|covid|pharma/.test(t)) topics.push('health');
  if (/dei|woke|gender|diversity/.test(t)) topics.push('dei');
  if (topics.length === 0) topics.push('governance');
  return topics;
}

export async function fetchExecutiveOrders(): Promise<void> {
  if (cache.isFresh('executive_orders')) return;
  console.log('[EO] Fetching executive orders...');

  try {
    const url = `${BASE}/documents?conditions[presidential_document_type]=executive_order&conditions[president]=donald-trump&per_page=50&order=newest`;
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_API) });
    if (!res.ok) throw new Error(`Federal Register API ${res.status}`);

    const data = await res.json() as { results?: any[] };
    const orders: ExecutiveOrder[] = (data.results || []).map((doc: any) => ({
      number: doc.executive_order_number || 0,
      title: doc.title || '',
      signing_date: doc.signing_date || doc.publication_date || '',
      publication_date: doc.publication_date || '',
      summary: doc.abstract || '',
      topics: classifyTopics(doc.title || ''),
      federal_register_url: doc.html_url || '',
      status: 'active' as const,
    }));

    cache.set('executive_orders', orders, TTL.EXECUTIVE_ORDERS);
    console.log(`[EO] Cached ${orders.length} executive orders`);
  } catch (err) {
    console.error('[EO] Fetch failed:', err instanceof Error ? err.message : err);
  }
}
