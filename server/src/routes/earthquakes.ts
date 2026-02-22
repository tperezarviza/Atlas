import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { Earthquake } from '../services/earthquakes.js';

export function registerEarthquakeRoutes(app: FastifyInstance) {
  app.get('/api/earthquakes', async (req) => {
    return respondWithMeta('earthquakes', req.query as Record<string, string>);
  });
}
