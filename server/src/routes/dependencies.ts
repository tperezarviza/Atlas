import type { FastifyInstance } from 'fastify';
import { STRATEGIC_DEPENDENCIES } from '../data/dependencies.js';

export function registerDependenciesRoutes(app: FastifyInstance) {
  app.get('/api/dependencies', async () => {
    return STRATEGIC_DEPENDENCIES;
  });
}
