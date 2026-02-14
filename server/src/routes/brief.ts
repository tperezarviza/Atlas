import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { fetchBrief } from '../services/ai-brief.js';
import { TTL, sanitizeError } from '../config.js';
import type { BriefResponse } from '../types.js';

const mockBrief: BriefResponse = {
  html: `<h2>■ SITUATION OVERVIEW</h2>
<p>Global security landscape remains elevated with three critical conflicts (Russia-Ukraine, Israel-Palestine, Sudan) showing no signs of de-escalation. Markets are cautiously optimistic despite geopolitical headwinds, with strong US economic data providing a floor.</p>
<h2>■ CRITICAL DEVELOPMENTS</h2>
<ul>
<li>Russia launched massive missile barrage on Kharkiv — 12+ killed</li>
<li>RSF advances on El-Fasher; UN warns of potential genocide in Darfur</li>
<li>IAEA reports Iran enrichment at 83.7% — near weapons grade</li>
<li>Houthi forces continue Red Sea shipping attacks</li>
</ul>
<h2>■ THREAT MATRIX</h2>
<p><strong>CRITICAL:</strong> Iran nuclear threshold, Sudan humanitarian catastrophe</p>
<p><strong>ELEVATED:</strong> Red Sea shipping disruption, PLA Taiwan ADIZ incursions</p>
<p><strong>WATCH:</strong> DPRK missile tests, Sahel Wagner expansion</p>
<h2>■ MARKET IMPLICATIONS</h2>
<p>Oil prices supported by Red Sea disruptions (+1.2%). Gold holding gains on geopolitical risk. VIX declining suggests markets pricing in strong US fundamentals over conflict risks.</p>
<h2>■ 72-HOUR OUTLOOK</h2>
<p>Watch for: EU Foreign Affairs Council sanctions decisions, NATO Defence Ministers Ukraine package, potential Iranian response to IAEA pressure.</p>`,
  generatedAt: new Date().toISOString(),
  model: 'mock',
  sources: ['ACLED', 'GDELT', 'Market Data', 'Leader Feeds'],
};

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
    return cache.get<BriefResponse>(cacheKey) ?? mockBrief;
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
      return cache.get<BriefResponse>(cacheKey) ?? mockBrief;
    }
  });
}
