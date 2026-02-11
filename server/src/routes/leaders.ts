import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockLeaderFeed } from '../mock/leaderFeed.js';
import type { FeedItem } from '../types.js';

export function registerLeadersRoutes(app: FastifyInstance) {
  app.get('/api/leaders', async () => {
    return cache.get<FeedItem[]>('feed') ?? mockLeaderFeed;
  });
}
