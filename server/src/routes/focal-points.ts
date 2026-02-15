import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerFocalPointsRoutes(app: FastifyInstance) {
  app.get('/api/focal-points', async () => cache.get('focal_points') ?? []);
}
