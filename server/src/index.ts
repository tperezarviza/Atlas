import Fastify from 'fastify';
import cors from '@fastify/cors';
import { PORT } from './config.js';
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
import { startCronJobs } from './cron.js';
import { warmUpCache } from './services/warmup.js';

const app = Fastify({ logger: true });

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
  : ['http://localhost:5173', 'http://localhost:4173'];

await app.register(cors, { origin: CORS_ORIGINS });

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

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`ATLAS API server running on port ${PORT}`);

  // Warm up caches in background (don't block startup)
  warmUpCache().catch((err) => {
    console.error('Cache warmup error:', err);
  });

  // Start cron jobs
  startCronJobs();
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
