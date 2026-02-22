import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { redisGet, redisSet } from '../redis.js';
import { aiComplete } from '../utils/ai-client.js';

// Simple in-memory rate limiter: 10 req/min per IP
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

// Clean up stale entries every 2 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimits) {
    if (now > entry.resetAt) rateLimits.delete(ip);
  }
}, 120_000);

const SYSTEM_PROMPT = `You are a geopolitical intelligence analyst. Given a news headline, provide a brief "Why It Matters" context (2-3 sentences max). Focus on: strategic implications, affected alliances, economic impact, or escalation potential. Be concise and analytical. Do not repeat the headline.`;

export function registerWhyItMattersRoutes(app: FastifyInstance) {
  app.get('/api/why-it-matters', async (request, reply) => {
    const { headline, category, lat, lng } = request.query as Record<string, string | undefined>;

    const safeHeadline = (headline ?? '').slice(0, 200);
    if (!safeHeadline || safeHeadline.length < 5) {
      return reply.status(400).send({ error: 'headline parameter required (5-200 chars)' });
    }

    // Rate limit
    const ip = request.ip;
    if (!checkRateLimit(ip)) {
      return reply.status(429).send({ error: 'Rate limit exceeded (10/min)' });
    }

    // Redis cache (6h)
    const hash = crypto.createHash('md5').update(safeHeadline).digest('hex').slice(0, 12);
    const cacheKey = `wim:${hash}`;

    const cached = await redisGet<{ context: string; provider: string }>(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // AI analysis with Haiku
    const locationHint = lat && lng ? `Location: ${lat}, ${lng}.` : '';
    const categoryHint = category ? `Category: ${category}.` : '';

    const response = await aiComplete(
      SYSTEM_PROMPT,
      `Analyze this headline: <user_headline>${safeHeadline}</user_headline>\n${categoryHint}\n${locationHint}\n\nWhy does this matter?`,
      { preferHaiku: true, maxTokens: 200 },
    );

    const result = { context: response.text.trim(), provider: response.provider };

    // Cache for 6h
    await redisSet(cacheKey, result, 6 * 3600);

    return { ...result, cached: false };
  });
}
