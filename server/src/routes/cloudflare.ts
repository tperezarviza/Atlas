import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerCloudflareRoutes(app: FastifyInstance) {
  app.get('/api/cloudflare-outages', async () => cache.get('cloudflare_outages') ?? []);
}
