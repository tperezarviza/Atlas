# ATLAS — Geopolitical Intelligence Dashboard

Real-time geopolitical intelligence platform designed for situation room displays. Aggregates 40+ live data sources into a single operational picture: conflicts, markets, leader feeds, cyber threats, military flights, satellite imagery, and AI-generated intelligence briefs.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + Vite + Tailwind v4)                   │
│  Leaflet map, framer-motion animations, 8 view modes        │
├─────────────────────────────────────────────────────────────┤
│  Backend (Fastify 5 + TypeScript)                           │
│  40+ API routes, in-memory cache, cron polling, AI briefs   │
├─────────────────────────────────────────────────────────────┤
│  Data Sources                                                │
│  ACLED · GDELT · Twelve Data · FRED · EIA · Congress.gov     │
│  OpenSky · X/Twitter · AlienVault · Shodan · Sentinel Hub    │
│  EONET · OONI · RealClearPolitics · RSS feeds                │
└─────────────────────────────────────────────────────────────┘
```

## Features

- **8 View Modes**: Global, Middle East, Ukraine, Domestic, Cyber, Markets, Intel, China
- **Interactive Map**: Conflict markers, news heatmap, connection lines, military flights, shipping chokepoints, nuclear facilities, vessel tracking, natural events
- **AI Intelligence Briefs**: Claude-generated situation reports with per-view focus
- **Markets Dashboard**: Indices, commodities, forex, crypto, CDS spreads, sessions
- **Leader Feed**: Aggregated statements from world leaders, think tanks, X/OSINT
- **Alert System**: Real-time alert generation from GDELT, ACLED, market moves
- **Country Profiles**: Click any country for military, risk, sanctions, dependencies
- **Kiosk Mode**: Full-screen, cursor-hidden, auto-rotating for TV displays
- **Boot Sequence**: Terminal-style initialization screen

## Quick Start (Development)

```bash
# 1. Clone and install
git clone <repo-url> && cd atlas
npm install
cd server && npm install && cd ..

# 2. Configure environment
cp .env.production.example .env
# Edit .env with your API keys (all optional — mock data used as fallback)

# 3. Run both frontend + backend
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## API Keys

All API keys are optional. Without them, the dashboard runs on built-in mock data.

| Service | Purpose | Cost | Required |
|---------|---------|------|----------|
| Anthropic | AI intelligence briefs | Pay-per-use | No |
| ACLED | Conflict data | Free (academic) | No |
| Twelve Data | Market indices | Free tier | No |
| EIA | Energy/oil data | Free | No |
| FRED | US macro indicators | Free | No |
| Congress.gov | Legislation tracking | Free | No |
| OpenSky | Military flight tracking | Free | No |
| X/Twitter | OSINT feeds | $100/mo | No |
| AlienVault OTX | Cyber threat intel | Free | No |
| Shodan | Infrastructure exposure | $59 one-time | No |
| Sentinel Hub | Satellite imagery | Free tier | No |

## Production Deploy (Docker)

```bash
# 1. Configure environment
cp .env.production.example .env
# Edit .env with production API keys

# 2. Build and run
npm run docker:up

# Dashboard available at http://localhost
# API available at http://localhost/api/health

# View logs
npm run docker:logs

# Stop
npm run docker:down
```

### Docker Architecture

| Container | Image | Port | Description |
|-----------|-------|------|-------------|
| `frontend` | nginx:alpine | 80 | Serves built SPA, proxies `/api/*` to backend |
| `server` | node:22-alpine | 3001 | Fastify API server with cron jobs |

### Custom Domain / HTTPS

Put a reverse proxy (Caddy, Traefik, or Cloudflare Tunnel) in front of port 80. Update `CORS_ORIGINS` in `.env` to include your domain.

## TV / Kiosk Setup

For running ATLAS on a dedicated TV or monitor:

```bash
# Option 1: URL parameter
http://your-server?kiosk=true

# Option 2: Keyboard shortcut (in browser)
# Ctrl+8 toggles kiosk mode
```

Kiosk mode features:
- Full-screen display
- Hidden cursor
- Hidden scrollbars
- Auto-rotates through all 8 views every 5 minutes
- Auto-refreshes page every 30 minutes
- Wake lock prevents screen sleep

Recommended hardware: any device with a modern browser (Raspberry Pi 4+, Intel NUC, Fire TV Stick with Silk browser, or a dedicated PC).

## Project Structure

```
atlas/
├── src/                      # Frontend (React)
│   ├── components/           # UI components (40+)
│   │   ├── map/              # Map layer components
│   │   └── tabs/             # View-specific tab panels
│   ├── hooks/                # Custom hooks (useApiData, useKioskMode, etc.)
│   ├── data/                 # Mock data files
│   ├── services/api.ts       # API client
│   ├── types/                # TypeScript types
│   └── App.tsx               # Main layout (CSS Grid)
├── server/                   # Backend (Fastify)
│   └── src/
│       ├── routes/           # API route handlers (30+)
│       ├── services/         # Data fetching services
│       ├── mock/             # Fallback mock data
│       ├── data/             # Static reference data
│       ├── cache.ts          # In-memory TTL cache
│       ├── cron.ts           # Polling scheduler
│       └── index.ts          # Server entry point
├── public/data/              # GeoJSON for map borders
├── Dockerfile.frontend       # Multi-stage: build → nginx
├── Dockerfile.server         # Node.js production build
├── docker-compose.yml        # Orchestration
├── nginx.conf                # SPA routing + API proxy
└── .env.production.example   # All environment variables
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:fe` | Start frontend only |
| `npm run build` | Build frontend |
| `npm run build:all` | Build frontend + backend |
| `npm run test` | Run test suite (93 tests) |
| `npm run lint` | ESLint check |
| `npm run docker:up` | Build and start Docker containers |
| `npm run docker:down` | Stop Docker containers |
| `npm run docker:logs` | Tail container logs |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+1` | Global view |
| `Ctrl+2` | Middle East view |
| `Ctrl+3` | Ukraine view |
| `Ctrl+4` | Domestic view |
| `Ctrl+5` | Cyber view |
| `Ctrl+6` | Markets view |
| `Ctrl+7` | Intel view |
| `Ctrl+8` | China view |

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7, Tailwind CSS v4, framer-motion, Leaflet, DOMPurify
- **Backend**: Fastify 5, TypeScript, node-cron, Anthropic SDK, cheerio, rss-parser
- **Deploy**: Docker, nginx, Node.js 22
- **Testing**: Vitest, Testing Library, jsdom

## License

Private. All rights reserved.
