import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerAnomalyRoutes(app: FastifyInstance) {
  app.get('/api/anomalies', async () => cache.get('anomalies') ?? []);
}
