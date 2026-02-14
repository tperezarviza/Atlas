import type { FastifyInstance } from 'fastify';
import { getVessels } from '../services/vessels.js';

export function registerVesselsRoutes(app: FastifyInstance) {
  app.get('/api/vessels', async () => {
    return getVessels();
  });
}
