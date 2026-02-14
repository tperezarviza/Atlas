import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { mockTwitter } from '../mock/twitter.js';
import type { TwitterIntelItem, TweetCategory } from '../types.js';

const VALID_CATEGORIES = new Set<TweetCategory>(['crisis', 'military', 'geopolitical', 'border', 'osint', 'trump']);

export function registerTwitterRoutes(app: FastifyInstance) {
  app.get('/api/twitter', async (req, reply) => {
    const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? mockTwitter;
    const cat = (req.query as Record<string, string>).category;
    if (cat) {
      if (!VALID_CATEGORIES.has(cat as TweetCategory)) {
        return reply.code(400).send({ error: 'Invalid category', valid: [...VALID_CATEGORIES] });
      }
      return tweets.filter(t => t.category === cat);
    }
    return tweets;
  });

  app.get('/api/twitter/trending', async () => {
    const tweets = cache.get<TwitterIntelItem[]>('twitter') ?? mockTwitter;
    // Extract trending keywords from recent tweets
    const wordFreq = new Map<string, number>();
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'but', 'not', 'with', 'from', 'by', 'this', 'that', 'it', 'its', 'has', 'have', 'had', 'be', 'been', 'will', 'would', 'could', 'should', 'can', 'may', 'rt', 'via', 'just', 'now', 'new', 'says', 'said', 'https', 'http']);

    for (const t of tweets) {
      const words = t.text.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(w => w.length > 3 && !stopWords.has(w));
      for (const w of words) wordFreq.set(w, (wordFreq.get(w) || 0) + 1);
    }

    return [...wordFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([keyword, count]) => ({ keyword, count }));
  });
}
