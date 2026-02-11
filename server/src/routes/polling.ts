import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockPolling } from '../mock/polling.js';
import type { PollingData } from '../types.js';

export function registerPollingRoutes(app: FastifyInstance) {
  app.get('/api/polling', async () => {
    return cache.get<PollingData>('polling') ?? mockPolling;
  });
}
