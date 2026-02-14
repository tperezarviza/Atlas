import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockCongressBills, mockCongressNominations } from '../mock/congress.js';
import type { CongressBill, SenateNomination } from '../types.js';

export function registerCongressRoutes(app: FastifyInstance) {
  app.get('/api/congress/bills', async () => {
    return cache.get<CongressBill[]>('congress_bills') ?? mockCongressBills;
  });

  app.get('/api/congress/nominations', async () => {
    return cache.get<SenateNomination[]>('congress_nominations') ?? mockCongressNominations;
  });
}
