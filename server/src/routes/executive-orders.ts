import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockExecutiveOrders } from '../mock/executive-orders.js';
import type { ExecutiveOrder } from '../types.js';

export function registerExecutiveOrdersRoutes(app: FastifyInstance) {
  app.get('/api/executive-orders', async () => {
    return cache.get<ExecutiveOrder[]>('executive_orders') ?? mockExecutiveOrders;
  });
}
