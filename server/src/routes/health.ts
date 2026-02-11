import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

const CACHE_KEYS = [
  'conflicts', 'news', 'feed', 'markets', 'macro', 'border',
  'calendar', 'brief', 'connections', 'ticker', 'topbar',
];

const startTime = Date.now();

export function registerHealthRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => {
    const caches: Record<string, { fresh: boolean; age: number | null }> = {};
    for (const key of CACHE_KEYS) {
      caches[key] = {
        fresh: cache.isFresh(key),
        age: cache.age(key),
      };
    }

    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - startTime) / 1000),
      caches,
    };
  });
}
