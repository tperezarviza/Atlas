import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerFirmsRoutes(app: FastifyInstance) {
  app.get('/api/fire-hotspots', async () => cache.get('fire_hotspots') ?? []);
}
