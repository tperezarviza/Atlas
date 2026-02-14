import type { FastifyInstance } from 'fastify';
import { getAlerts, markAlertRead } from '../services/alerts.js';

export function registerAlertsRoutes(app: FastifyInstance) {
  app.get('/api/alerts', async () => {
    return getAlerts();
  });

  app.post<{ Params: { id: string } }>('/api/alerts/:id/read', async (request, reply) => {
    const { id } = request.params;
    if (id.length > 64 || !/^[a-f0-9]+$/.test(id)) {
      reply.status(400);
      return { error: 'Invalid alert ID format' };
    }
    const ok = markAlertRead(id);
    return { ok };
  });
}
