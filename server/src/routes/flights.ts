import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockFlights } from '../mock/flights.js';
import type { MilitaryFlight } from '../types.js';

export function registerFlightsRoutes(app: FastifyInstance) {
  app.get('/api/flights', async (req) => {
    const allFlights = cache.get<MilitaryFlight[]>('flights') ?? mockFlights;
    const region = (req.query as Record<string, string>).region;
    if (region) {
      return allFlights.filter(f => f.region === region);
    }
    return allFlights;
  });
}
