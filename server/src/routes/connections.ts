import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockConnections } from '../mock/connections.js';
import type { Connection } from '../types.js';

export function registerConnectionsRoutes(app: FastifyInstance) {
  app.get('/api/connections', async () => {
    return cache.get<Connection[]>('connections') ?? mockConnections;
  });
}
