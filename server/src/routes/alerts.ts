import type { FastifyInstance } from 'fastify';
import { cache } from '../cache.js';
import { requireAdmin } from '../utils/auth.js';
import { getAlerts, markAlertRead, injectTestAlert } from '../services/alerts.js';
import type { AlertPriority, AlertSource } from '../types.js';

const TEST_SCENARIOS: Record<string, { priority: AlertPriority; source: AlertSource; title: string; detail: string }> = {
  earthquake: {
    priority: 'flash',
    source: 'usgs',
    title: 'TSUNAMI WARNING: 80 km S of Sendai, Japan — M7.8',
    detail: 'Depth 12km • https://earthquake.usgs.gov/earthquakes/eventpage/test',
  },
  military: {
    priority: 'flash',
    source: 'twitter',
    title: 'BREAKING: Massive airstrike reported near Isfahan, Iran — air defense activated',
    detail: '@IntelCrab • 4521 RT • 12800 likes • https://x.com/test',
  },
  natural: {
    priority: 'urgent',
    source: 'eonet',
    title: 'EXTREME: Category 5 Hurricane approaching Caribbean',
    detail: 'Tropical Cyclones • https://eonet.gsfc.nasa.gov/test',
  },
  gdelt: {
    priority: 'flash',
    source: 'gdelt',
    title: 'URGENT: Massive bombing reported in Gaza City — dozens feared dead',
    detail: 'GDELT tone -9.2 — aljazeera.net',
  },
  rss: {
    priority: 'urgent',
    source: 'rss',
    title: 'IDF confirms large-scale strike on Hezbollah command center in Beirut',
    detail: '@IDF (RSS) • Israel Defense Forces',
  },
  trump: {
    priority: 'flash',
    source: 'twitter',
    title: 'BREAKING: Trump announces reimposition of maximum pressure sanctions on Iran',
    detail: '@realDonaldTrump • Truth Social',
  },
};

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

  app.post<{ Querystring: { scenario?: string } }>('/api/test-alert', async (request, reply) => {
    if (!requireAdmin(request, reply)) return reply;
    const scenario = request.query.scenario ?? 'military';
    const tpl = TEST_SCENARIOS[scenario] ?? TEST_SCENARIOS.military;
    const alert = injectTestAlert(tpl.priority, tpl.source, tpl.title, tpl.detail);
    return { ok: true, alert, availableScenarios: Object.keys(TEST_SCENARIOS) };
  });

  // Test endpoint: inject a fake Trump tweet to trigger TrumpNewsPopup
  app.post('/api/test-trump-post', async (request, reply) => {
    if (!requireAdmin(request, reply)) return reply;
    const existing = cache.get<any[]>('twitter') ?? [];
    const fakeTweet = {
      id: 'test-trump-' + Date.now(),
      text: 'We are reimposing MAXIMUM PRESSURE sanctions on Iran. The deal was terrible, the worst deal ever made. America will NOT be taken advantage of anymore!',
      author: {
        id: 'test-trump',
        username: 'realDonaldTrump',
        name: 'Donald J. Trump',
        verified: true,
        followers: 90000000,
      },
      created_at: new Date().toISOString(),
      retweets: 45000,
      likes: 180000,
      reply_count: 12000,
      category: 'trump',
      priority: 'flash',
      query_matched: 'trump',
      url: 'https://truthsocial.com/test',
    };
    existing.unshift(fakeTweet);
    cache.set('twitter', existing, 600);
    return { ok: true, tweet: fakeTweet };
  });

}
