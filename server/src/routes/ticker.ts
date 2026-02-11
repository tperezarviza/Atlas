import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockTicker } from '../mock/ticker.js';
import type { TickerItem } from '../types.js';

export function registerTickerRoutes(app: FastifyInstance) {
  app.get('/api/ticker', async () => {
    return cache.get<TickerItem[]>('ticker') ?? mockTicker;
  });
}
