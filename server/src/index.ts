import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { PORT, sanitizeError } from './config.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerConflictsRoutes } from './routes/conflicts.js';
import { registerNewsRoutes } from './routes/news.js';
import { registerLeadersRoutes } from './routes/leaders.js';
import { registerMarketsRoutes } from './routes/markets.js';
import { registerNewswireRoutes } from './routes/newswire.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerBriefRoutes } from './routes/brief.js';


import { registerTickerRoutes } from './routes/ticker.js';
import { registerTopbarRoutes } from './routes/topbar.js';
import { registerDependenciesRoutes } from './routes/dependencies.js';
import { registerCountriesRoutes } from './routes/countries.js';
import { registerSanctionsRoutes } from './routes/sanctions.js';
import { registerArmedGroupsRoutes } from './routes/armed-groups.js';
import { registerShippingRoutes } from './routes/shipping.js';
import { registerOoniRoutes } from './routes/ooni.js';
import { registerHostilityRoutes } from './routes/hostility.js';
import { registerPropagandaRoutes } from './routes/propaganda.js';
import { registerSipriRoutes } from './routes/sipri.js';
import { registerGtdRoutes } from './routes/gtd.js';
import { registerCongressRoutes } from './routes/congress.js';
import { registerExecutiveOrdersRoutes } from './routes/executive-orders.js';
import { registerFlightsRoutes } from './routes/flights.js';
import { registerUkraineFrontRoutes } from './routes/ukraine-front.js';
import { registerTwitterRoutes } from './routes/twitter.js';
import { registerCyberRoutes } from './routes/cyber.js';
import { registerEonetRoutes } from './routes/eonet.js';
import { registerEconomicCalendarRoutes } from './routes/economic-calendar.js';
import { registerAlertsRoutes } from './routes/alerts.js';

import { registerEarthquakeRoutes } from './routes/earthquakes.js';
import { registerCloudflareRoutes } from './routes/cloudflare.js';
import { registerFirmsRoutes } from './routes/firms.js';
import { registerPolymarketRoutes } from './routes/polymarket.js';
import { registerCIIRoutes } from './routes/cii.js';
import { registerFocalPointsRoutes } from './routes/focal-points.js';

import { registerLayerRoutes } from './routes/layers.js';
import { registerWhyItMattersRoutes } from './routes/why-it-matters.js';
import { startCronJobs } from './cron.js';
import { warmUpCache } from './services/warmup.js';
import { loadStaticLayers } from './services/static-layers.js';
import { initRedis } from './redis.js';
import { initBigQuery } from './services/bigquery.js';
import { cache } from './cache.js';
import { respondWithMeta } from './utils/respond.js';
import { requireAdmin } from './utils/auth.js';
import fastifyStatic from '@fastify/static';
import path from 'path';

const app = Fastify({ logger: true, trustProxy: true });

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

await app.register(cors, { origin: CORS_ORIGINS });

// Rate limiting — protect against abuse while allowing normal frontend polling
await app.register(rateLimit, {
  global: true,
  max: 120,           // 120 req/min default (frontend polls ~14 endpoints every 3-5 min)
  timeWindow: '1 minute',
  allowList: (req: any) => {
    // No limit for internal Docker network requests
    const ip = req.ip;
    return ip?.startsWith('172.') || ip?.startsWith('10.') || ip === '127.0.0.1' || ip === '::1';
  },
  errorResponseBuilder: (_req: any, context: any) => ({
    error: 'Rate limit exceeded',
    retryAfter: Math.ceil(context.ttl / 1000),
  }),
  addHeadersOnExceeding: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true },
  addHeaders: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'retry-after': true },
});

// HTTP Cache-Control headers for API responses
app.addHook('onSend', async (request, reply) => {
  const url = request.url;
  if (url.startsWith('/assets/')) {
    reply.header('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (url.startsWith('/data/')) {
    reply.header('Cache-Control', 'public, max-age=604800');
  } else if (url.startsWith('/api/')) {
    // Short cache for API responses — prevents thundering herd
    reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  }
});

// Security: CSP header (other security headers handled by Caddy reverse proxy)
app.addHook('onSend', async (_request, reply) => {
  reply.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://unpkg.com; connect-src 'self' https://atlas.slowhorses.net; frame-ancestors 'none'");
});

// Global error handler — never leak internals to clients
app.setErrorHandler((error: { statusCode?: number; code?: string; message?: string }, _request, reply) => {
  const status = error.statusCode ?? 500;
  if (status >= 500) {
    console.error(`[SERVER] ${error.code ?? 'ERR'}:`, sanitizeError(error));
  }
  reply.status(status).send({ error: status >= 500 ? 'Internal server error' : (error.message ?? 'Error') });
});

// Serve frontend static files (built by Vite into /app/dist)
const distPath = path.resolve(process.cwd(), '..', 'dist');
await app.register(fastifyStatic, {
  root: distPath,
  prefix: '/',
  wildcard: false,
});

// Register all routes
registerHealthRoutes(app);
registerConflictsRoutes(app);
registerNewsRoutes(app);
registerLeadersRoutes(app);
registerMarketsRoutes(app);
registerNewswireRoutes(app);
registerCalendarRoutes(app);
registerBriefRoutes(app);
registerTickerRoutes(app);
registerTopbarRoutes(app);
registerDependenciesRoutes(app);
registerCountriesRoutes(app);
registerSanctionsRoutes(app);
registerArmedGroupsRoutes(app);
registerShippingRoutes(app);
registerOoniRoutes(app);
registerHostilityRoutes(app);
registerPropagandaRoutes(app);
registerSipriRoutes(app);
registerGtdRoutes(app);
registerCongressRoutes(app);
registerExecutiveOrdersRoutes(app);
registerFlightsRoutes(app);
registerUkraineFrontRoutes(app);
registerTwitterRoutes(app);
registerCyberRoutes(app);
registerEonetRoutes(app);
registerEconomicCalendarRoutes(app);
registerAlertsRoutes(app);
registerEarthquakeRoutes(app);
registerCloudflareRoutes(app);
registerFirmsRoutes(app);
registerPolymarketRoutes(app);
registerCIIRoutes(app);
registerFocalPointsRoutes(app);
registerLayerRoutes(app);
registerWhyItMattersRoutes(app);

// Google Trends route (BQ-powered)
app.get('/api/google-trends', async (req) => respondWithMeta('google_trends', req.query as Record<string, string>));

// Surge detection route
app.get('/api/surge-alerts', async (req, reply) => {
  if (!requireAdmin(req, reply)) return reply;
  return cache.get('surge_alerts') ?? [];
});

// SPA fallback — serve index.html for non-API routes
app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/')) {
    reply.status(404).send({ error: 'Not found' });
  } else {
    reply.sendFile('index.html');
  }
});

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`ATLAS API server running on port ${PORT}`);

  // Load static GeoJSON layers (sync, from disk)
  loadStaticLayers();

  // Initialize Redis connection
  initRedis();

  // Initialize BigQuery (if configured)
  initBigQuery();

  // Warm up caches, then start cron jobs
  try {
    await warmUpCache();
    console.log('[STARTUP] Warmup complete, starting cron jobs...');
  } catch (err) {
    console.error('Cache warmup error:', sanitizeError(err));
  }

  // Start cron jobs
  startCronJobs();


// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[SHUTDOWN] Received ${signal}, shutting down gracefully...`);
  try {
    await app.close();
  } catch {}
  // Allow 5s for ongoing requests to drain
  await new Promise(r => setTimeout(r, 5000));
  console.log('[SHUTDOWN] Done');
  process.exit(0);
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
