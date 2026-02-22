import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';
import type { CongressBill, SenateNomination } from '../types.js';

export function registerCongressRoutes(app: FastifyInstance) {
  app.get('/api/congress/bills', async (req) => {
    return respondWithMeta('congress_bills', req.query as Record<string, string>);
  });

  app.get('/api/congress/nominations', async (req) => {
    return respondWithMeta('congress_nominations', req.query as Record<string, string>);
  });
}
