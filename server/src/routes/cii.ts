import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerCIIRoutes(app: FastifyInstance) {
  app.get('/api/cii', async () => cache.get('cii') ?? []);
}
