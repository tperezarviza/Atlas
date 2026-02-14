import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockOoni } from '../mock/ooni.js';
import type { InternetIncident } from '../types.js';

export function registerOoniRoutes(app: FastifyInstance) {
  app.get('/api/internet-incidents', async () => {
    return cache.get<InternetIncident[]>('ooni') ?? mockOoni;
  });
}
