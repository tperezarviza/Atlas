import type { FastifyInstance } from 'fastify';
import { respondWithMeta } from '../utils/respond.js';
import type { InternetIncident } from '../types.js';

export function registerOoniRoutes(app: FastifyInstance) {
  app.get('/api/internet-incidents', async (req) => {
    return respondWithMeta('ooni', req.query as Record<string, string>);
  });
}
