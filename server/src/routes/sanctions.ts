import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { OFACSanction } from '../services/sanctions.js';

export function registerSanctionsRoutes(app: FastifyInstance) {
  app.get('/api/sanctions', async (req) => {
    return respondWithMeta('ofac_sanctions', req.query as Record<string, string>);
  });
}
