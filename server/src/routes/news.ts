import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockNews } from '../mock/news.js';
import type { NewsPoint } from '../types.js';

export function registerNewsRoutes(app: FastifyInstance) {
  app.get('/api/news', async () => {
    return cache.get<NewsPoint[]>('news') ?? mockNews;
  });
}
