import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { buildCyberIntelligence } from '../services/cyber.js';
import type { CyberThreatPulse } from '../types.js';

export function registerCyberRoutes(app: FastifyInstance) {
  app.get('/api/cyber', async () => {
    return buildCyberIntelligence();
  });

  app.get('/api/cyber/threats', async () => {
    return cache.get<CyberThreatPulse[]>('cyber_threats') ?? [];
  });
}
