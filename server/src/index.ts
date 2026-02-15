import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PORT, sanitizeError } from './config.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerConflictsRoutes } from './routes/conflicts.js';
import { registerNewsRoutes } from './routes/news.js';
import { registerLeadersRoutes } from './routes/leaders.js';
import { registerMarketsRoutes } from './routes/markets.js';
import { registerNewswireRoutes } from './routes/newswire.js';
import { registerCalendarRoutes } from './routes/calendar.js';
import { registerBriefRoutes } from './routes/brief.js';
import { registerBorderRoutes } from './routes/border.js';
import { registerConnectionsRoutes } from './routes/connections.js';
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
import { registerVesselsRoutes } from './routes/vessels.js';
import { registerEarthquakeRoutes } from './routes/earthquakes.js';
import { registerCloudflareRoutes } from './routes/cloudflare.js';
import { registerFirmsRoutes } from './routes/firms.js';
import { registerPolymarketRoutes } from './routes/polymarket.js';
import { registerCIIRoutes } from './routes/cii.js';
import { registerFocalPointsRoutes } from './routes/focal-points.js';
import { startCronJobs } from './cron.js';
import { warmUpCache } from './services/warmup.js';
import { initRedis } from './redis.js';
import fastifyStatic from '@fastify/static';
import path from 'path';

const app = Fastify({ logger: true });

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173', '*'];

await app.register(cors, { origin: CORS_ORIGINS });

// Security response headers
app.addHook('onSend', async (_request, reply) => {
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('X-Frame-Options', 'DENY');
  reply.header('X-XSS-Protection', '1; mode=block');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
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
registerBorderRoutes(app);
registerConnectionsRoutes(app);
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
registerVesselsRoutes(app);
registerEarthquakeRoutes(app);
registerCloudflareRoutes(app);
registerFirmsRoutes(app);
registerPolymarketRoutes(app);
registerCIIRoutes(app);
registerFocalPointsRoutes(app);

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

  // Initialize Redis connection
  initRedis();

  // Warm up caches in background (don't block startup)
  warmUpCache().catch((err) => {
    console.error('Cache warmup error:', sanitizeError(err));
  });

  // Start cron jobs
  startCronJobs();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
