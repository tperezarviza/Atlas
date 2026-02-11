import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockNewsWire } from '../mock/newsWire.js';
import type { NewsWireItem } from '../types.js';

export function registerNewswireRoutes(app: FastifyInstance) {
  app.get('/api/newswire', async () => {
    return cache.get<NewsWireItem[]>('newswire') ?? mockNewsWire;
  });
}
