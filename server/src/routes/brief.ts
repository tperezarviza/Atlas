import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { fetchBrief } from '../services/ai-brief.js';
import { TTL, sanitizeError } from '../config.js';
import type { BriefResponse } from '../types.js';

const VALID_FOCUS = new Set(['mideast', 'ukraine', 'domestic', 'intel']);

function parseFocus(raw?: string): string | undefined {
  return raw && VALID_FOCUS.has(raw) ? raw : undefined;
}

/** Simple rate limiter: 1 regeneration per RATE_LIMIT_MS globally */
const RATE_LIMIT_MS = 60_000;
let lastRegenAt = 0;

export function registerBriefRoutes(app: FastifyInstance) {
  app.get('/api/brief', async (req) => {
    const focus = parseFocus((req.query as { focus?: string }).focus);
    const cacheKey = focus ? `brief:${focus}` : 'brief';
    return cache.get<BriefResponse>(cacheKey) ?? null;
  });

  app.post('/api/brief/regenerate', async (req, reply) => {
    const focus = parseFocus((req.query as { focus?: string }).focus);
    const now = Date.now();
    const elapsed = now - lastRegenAt;

    if (elapsed < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - elapsed) / 1000);
      reply.status(429);
      return { error: `Rate limited. Try again in ${waitSec}s.` };
    }

    lastRegenAt = now;

    try {
      const brief = await fetchBrief(focus);
      const cacheKey = focus ? `brief:${focus}` : 'brief';
      cache.set(cacheKey, brief, TTL.BRIEF);
      return brief;
    } catch (err) {
      console.error('Brief regeneration failed:', sanitizeError(err));
      const cacheKey = focus ? `brief:${focus}` : 'brief';
      return cache.get<BriefResponse>(cacheKey) ?? null;
    }
  });
}
