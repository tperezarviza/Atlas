import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockCyber } from '../mock/cyber.js';
import { buildCyberIntelligence } from '../services/cyber.js';
import type { CyberThreatPulse } from '../types.js';

export function registerCyberRoutes(app: FastifyInstance) {
  app.get('/api/cyber', async () => {
    const built = buildCyberIntelligence();
    if (built.active_threats.length > 0) {
      return built;
    }
    return mockCyber;
  });

  app.get('/api/cyber/threats', async () => {
    return cache.get<CyberThreatPulse[]>('cyber_threats') ?? mockCyber.active_threats;
  });
}
