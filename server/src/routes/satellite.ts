import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockSatellite } from '../mock/satellite.js';
import type { SatelliteData } from '../types.js';

export function registerSatelliteRoutes(app: FastifyInstance) {
  app.get('/api/satellite', async () => {
    return cache.get<SatelliteData>('satellite') ?? mockSatellite;
  });

  app.get<{ Params: { id: string } }>('/api/satellite/:id', async (req, reply) => {
    const data = cache.get<SatelliteData>('satellite') ?? mockSatellite;
    const wp = data.watchpoints.find(w => w.id === req.params.id);
    if (!wp) return reply.code(404).send({ error: 'Watchpoint not found' });
    return wp;
  });
}
