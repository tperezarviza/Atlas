import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';
import { getMarketSessions } from '../services/sessions.js';
import type { MarketSection, MacroItem } from '../types.js';

export function registerMarketsRoutes(app: FastifyInstance) {
  app.get('/api/markets', async (req) => {
    const mkts = cache.getWithStatus('markets');
    const fxs = cache.getWithStatus('forex');
    return {
      sections: mkts.data ?? [],
      forex: fxs.data ?? [],
      sessions: getMarketSessions(),
      macro: cache.get<MacroItem[]>('macro') ?? [],
      meta: {
        cacheStatus: mkts.status,
        ageMs: mkts.ageMs,
        lastUpdate: cache.getSetAt('markets') ? new Date(cache.getSetAt('markets')!).toISOString() : null,
      },
    };
  });
}
