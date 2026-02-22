import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { MilitaryFlight } from '../types.js';

const VALID_REGIONS = new Set([
  'europe_ukraine', 'middle_east', 'taiwan_strait',
  'korean_peninsula', 'baltic_sea', 'black_sea', 'us_east_coast',
]);

export function registerFlightsRoutes(app: FastifyInstance) {
  app.get('/api/flights', async (req, reply) => {
    const result = respondWithMeta('flights', req.query as Record<string, string>);
    const region = (req.query as Record<string, string>).region;
    if (region) {
      if (!VALID_REGIONS.has(region)) {
        return reply.code(400).send({ error: 'Invalid region', valid: [...VALID_REGIONS] });
      }
      const filtered = (Array.isArray(result.data) ? result.data : []).filter((f: any) => f.region === region);
      return { data: filtered, meta: result.meta };
    }
    return result;
  });
}
