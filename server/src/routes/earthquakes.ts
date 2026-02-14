import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { Earthquake } from '../services/earthquakes.js';

export function registerEarthquakeRoutes(app: FastifyInstance) {
  app.get('/api/earthquakes', async () => {
    return cache.get<Earthquake[]>('earthquakes') ?? [];
  });
}
