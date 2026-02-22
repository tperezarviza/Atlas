import { cache } from '../cache.js';

/** Wrap cached data with freshness metadata and optional pagination */
export function respondWithMeta(cacheKey: string, query?: Record<string, string | undefined>) {
  const status = cache.getWithStatus(cacheKey);
  const items = status?.data;
  const meta: Record<string, unknown> = {
    cacheStatus: status?.status ?? 'no_data',
    ageMs: status?.ageMs ?? null,
    lastUpdate: cache.getSetAt(cacheKey) ? new Date(cache.getSetAt(cacheKey)!).toISOString() : null,
  };

  if (Array.isArray(items) && query) {
    const limit = Math.min(Math.max(parseInt(query.limit || '200', 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
    const data = items.slice(offset, offset + limit);
    return { data, meta: { ...meta, total: items.length, limit, offset, hasMore: offset + limit < items.length } };
  }

  return { data: items ?? null, meta };
}
