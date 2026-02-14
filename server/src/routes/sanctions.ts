import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { OFACSanction } from '../services/sanctions.js';

export function registerSanctionsRoutes(app: FastifyInstance) {
  app.get('/api/sanctions', async () => {
    return cache.get<OFACSanction[]>('ofac_sanctions') ?? [];
  });
}
