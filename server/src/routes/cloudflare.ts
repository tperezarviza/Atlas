import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { respondWithMeta } from '../utils/respond.js';

export function registerCloudflareRoutes(app: FastifyInstance) {
  app.get('/api/cloudflare-outages', async (req) => respondWithMeta('cloudflare_outages', req.query as Record<string, string>));
}
