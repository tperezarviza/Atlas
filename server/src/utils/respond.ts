import { cache } from '../cache.js';

/**
 * Wrap cached data with freshness metadata and optional pagination.
 *
 * BACKWARD COMPATIBLE: Returns raw data by default (for existing frontend).
 * Pass ?_envelope=true to get the {data, meta} wrapper format.
 * Pagination (?limit=N&offset=N) works in both modes.
 */
export function respondWithMeta(cacheKey: string, query?: Record<string, string | undefined>) {
  const status = cache.getWithStatus(cacheKey);
  const items = status?.data;
  const envelope = query?._envelope === 'true';

  // Build metadata
  const meta: Record<string, unknown> = {
    cacheStatus: status?.status ?? 'no_data',
    ageMs: status?.ageMs ?? null,
    lastUpdate: cache.getSetAt(cacheKey) ? new Date(cache.getSetAt(cacheKey)!).toISOString() : null,
  };

  if (Array.isArray(items) && query) {
    const limit = Math.min(Math.max(parseInt(query.limit || '200', 10) || 200, 1), 1000);
    const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);

    // Only paginate if limit or offset explicitly provided
    const hasPagination = query.limit !== undefined || query.offset !== undefined;

    if (hasPagination || envelope) {
      const data = items.slice(offset, offset + limit);
      if (envelope) {
        return { data, meta: { ...meta, total: items.length, limit, offset, hasMore: offset + limit < items.length } };
      }
      // With pagination but no envelope: return raw array (paginated)
      return data;
    }

    // No pagination, no envelope: return raw array (full)
    return items;
  }

  // Non-array data
  if (envelope) {
    return { data: items ?? null, meta };
  }
  return items ?? [];
}
