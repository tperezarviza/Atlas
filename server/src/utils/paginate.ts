/** Generic pagination for array responses */
export function paginate<T>(items: T[], query: Record<string, string | undefined>): {
  data: T[];
  meta: { total: number; limit: number; offset: number; hasMore: boolean };
} {
  const limit = Math.min(Math.max(parseInt(query.limit || '200', 10) || 200, 1), 1000);
  const offset = Math.max(parseInt(query.offset || '0', 10) || 0, 0);
  const data = items.slice(offset, offset + limit);
  return {
    data,
    meta: { total: items.length, limit, offset, hasMore: offset + limit < items.length },
  };
}
