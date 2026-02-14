import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import type { MilitaryFlight } from '../types.js';

const VALID_REGIONS = new Set([
  'europe_ukraine', 'middle_east', 'taiwan_strait',
  'korean_peninsula', 'baltic_sea', 'black_sea', 'us_east_coast',
]);

export function registerFlightsRoutes(app: FastifyInstance) {
  app.get('/api/flights', async (req, reply) => {
    const allFlights = cache.get<MilitaryFlight[]>('flights') ?? [];
    const region = (req.query as Record<string, string>).region;
    if (region) {
      if (!VALID_REGIONS.has(region)) {
        return reply.code(400).send({ error: 'Invalid region', valid: [...VALID_REGIONS] });
      }
      return allFlights.filter(f => f.region === region);
    }
    return allFlights;
  });
}
