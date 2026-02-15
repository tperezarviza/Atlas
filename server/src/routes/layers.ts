import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';

export function registerLayerRoutes(app: FastifyInstance) {
  app.get('/api/layers/bases', async () => {
    return cache.get('layer_bases') ?? { type: 'FeatureCollection', features: [] };
  });

  app.get('/api/layers/cables', async () => {
    return cache.get('layer_cables') ?? { type: 'FeatureCollection', features: [] };
  });

  app.get('/api/layers/pipelines', async () => {
    return cache.get('layer_pipelines') ?? { type: 'FeatureCollection', features: [] };
  });
}
