import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { BorderStat } from '../types.js';

export function registerBorderRoutes(app: FastifyInstance) {
  app.get('/api/border', async () => {
    return cache.get<BorderStat[]>('border') ?? [];
  });
}
