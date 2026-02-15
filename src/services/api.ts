const API_BASE = import.meta.env.VITE_API_URL ?? '';
const FETCH_TIMEOUT = 15_000; // 15 seconds
const POST_TIMEOUT = 60_000; // 60 seconds (AI generation can be slow)

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json')) {
    throw new Error(`API error: expected JSON, got ${ct ?? 'unknown'}`);
  }
  return res.json();
}

async function postJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(POST_TIMEOUT),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const ct = res.headers.get('content-type');
  if (!ct || !ct.includes('application/json')) {
    throw new Error(`API error: expected JSON, got ${ct ?? 'unknown'}`);
  }
  return res.json();
}

// ── Types matching backend responses ──

import type {
  Conflict,
  NewsPoint,
  FeedItem,
  MarketSection,
  MacroItem,
  BorderStat,
  NewsWireItem,
  CalendarEvent,
  Connection,
  TickerItem,
  MarketSession,
  StrategicDependency,
  CountryProfile,
  OFACSanction,
  ArmedGroup,
  Chokepoint,
  InternetIncident,
  HostilityPair,
  PropagandaEntry,
  ArmsTransfer,
  MilitarySpending,
  GTDSummary,
  CongressBill,
  SenateNomination,
  ExecutiveOrder,
  MilitaryFlight,
  UkraineFrontData,
  TwitterIntelItem,
  CyberIntelligence,
  CyberThreatPulse,
  NaturalEvent,
  EconomicEvent,
  Alert,
  Vessel,
  Earthquake,
  ConvergenceHotspot,
  SurgeAlert,
} from '../types';

export interface TopBarKPI {
  label: string;
  value: string;
  colorClass: string;
}

export interface TopBarData {
  kpis: TopBarKPI[];
  threatLevel: string;
}

export interface BriefResponse {
  html: string;
  generatedAt: string;
  model: string;
  sources: string[];
}

export interface MarketsResponse {
  sections: MarketSection[];
  forex: MarketSection[];
  sessions: MarketSession[];
  macro: MacroItem[];
  border: BorderStat[];
}

export interface HealthService {
  key: string;
  name: string;
  category: string;
  status: 'ok' | 'stale' | 'empty';
  ageSeconds: number | null;
}

export interface HealthResponse {
  status: string;
  uptime: number;
  summary: { ok: number; total: number };
  services: HealthService[];
}

export interface GeoJSONFeature {
  type: string;
  geometry: { type: string; coordinates: number[] | number[][] };
  properties: Record<string, unknown>;
}

export interface GeoJSONCollection {
  type: string;
  features: GeoJSONFeature[];
}

const VALID_BRIEF_FOCUS = new Set(['mideast', 'ukraine', 'domestic', 'intel']);

// ── API functions ──

export const api = {
  topbar:      (tab?: string) => {
    const params = tab && tab !== 'global' ? `?tab=${encodeURIComponent(tab)}` : '';
    return fetchJSON<TopBarData>(`/api/topbar${params}`);
  },
  conflicts:   () => fetchJSON<Conflict[]>('/api/conflicts'),
  news:        () => fetchJSON<NewsPoint[]>('/api/news'),
  leaders:     () => fetchJSON<FeedItem[]>('/api/leaders'),
  markets:     () => fetchJSON<MarketsResponse>('/api/markets'),
  newswire:    () => fetchJSON<NewsWireItem[]>('/api/newswire'),
  calendar:    () => fetchJSON<CalendarEvent[]>('/api/calendar'),
  brief:       (focus?: string) => {
    const validFocus = focus && VALID_BRIEF_FOCUS.has(focus) ? focus : undefined;
    const params = validFocus ? `?focus=${encodeURIComponent(validFocus)}` : '';
    return fetchJSON<BriefResponse>(`/api/brief${params}`);
  },
  regenBrief:  (focus?: string) => {
    const validFocus = focus && VALID_BRIEF_FOCUS.has(focus) ? focus : undefined;
    const params = validFocus ? `?focus=${encodeURIComponent(validFocus)}` : '';
    return postJSON<BriefResponse>(`/api/brief/regenerate${params}`);
  },
  ticker:      () => fetchJSON<TickerItem[]>('/api/ticker'),
  dependencies:() => fetchJSON<StrategicDependency[]>('/api/dependencies'),
  // Phase 2.5-B: Intelligence Services
  countries:          () => fetchJSON<CountryProfile[]>('/api/countries'),
  country:      (code: string) => fetchJSON<CountryProfile>(`/api/countries/${encodeURIComponent(code)}`),
  sanctions:          () => fetchJSON<OFACSanction[]>('/api/sanctions'),
  armedGroups:        () => fetchJSON<ArmedGroup[]>('/api/armed-groups'),
  armedGroup:    (id: string) => fetchJSON<ArmedGroup>(`/api/armed-groups/${encodeURIComponent(id)}`),
  shipping:           () => fetchJSON<Chokepoint[]>('/api/shipping'),
  internetIncidents:  () => fetchJSON<InternetIncident[]>('/api/internet-incidents'),
  hostility:          () => fetchJSON<HostilityPair[]>('/api/hostility'),
  hostilityPair:(pair: string) => fetchJSON<HostilityPair>(`/api/hostility/${encodeURIComponent(pair)}`),
  propaganda:         () => fetchJSON<PropagandaEntry[]>('/api/propaganda'),
  propagandaCountry: (code: string) => fetchJSON<PropagandaEntry>(`/api/propaganda/${encodeURIComponent(code)}`),
  armsTransfers:      () => fetchJSON<ArmsTransfer[]>('/api/arms-transfers'),
  militarySpending:   () => fetchJSON<MilitarySpending[]>('/api/military-spending'),
  terrorismHistory:   () => fetchJSON<GTDSummary[]>('/api/terrorism/history'),
  terrorismGroup:(group: string) => fetchJSON<GTDSummary>(`/api/terrorism/history/${encodeURIComponent(group)}`),
  // Phase 2.5-C: Domestic Intel & Flight Tracking
  congressBills:       () => fetchJSON<CongressBill[]>('/api/congress/bills'),
  congressNominations: () => fetchJSON<SenateNomination[]>('/api/congress/nominations'),
  executiveOrders:     () => fetchJSON<ExecutiveOrder[]>('/api/executive-orders'),
  militaryFlights:     (region?: string) => {
    const params = region ? `?region=${encodeURIComponent(region)}` : '';
    return fetchJSON<MilitaryFlight[]>(`/api/flights${params}`);
  },
  ukraineFront:        () => fetchJSON<UkraineFrontData>('/api/ukraine-front'),
  // Phase 2.5-D: Twitter, Cyber, Satellite, EONET, EconCalendar
  twitterIntel:        (category?: string) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJSON<TwitterIntelItem[]>(`/api/twitter${params}`);
  },
  twitterTrending:     () => fetchJSON<{ keyword: string; count: number }[]>('/api/twitter/trending'),
  cyberIntel:          () => fetchJSON<CyberIntelligence>('/api/cyber'),
  cyberThreats:        () => fetchJSON<CyberThreatPulse[]>('/api/cyber/threats'),
  naturalEvents:       (category?: string) => {
    const params = category ? `?category=${encodeURIComponent(category)}` : '';
    return fetchJSON<NaturalEvent[]>(`/api/natural-events${params}`);
  },
  economicCalendar:    (currency?: string) => {
    const params = currency ? `?currency=${encodeURIComponent(currency)}` : '';
    return fetchJSON<EconomicEvent[]>(`/api/economic-calendar${params}`);
  },
  // Phase 3.5-A: Alerts
  alerts:        () => fetchJSON<Alert[]>('/api/alerts'),
  markAlertRead: (id: string) => postJSON<{ ok: boolean }>(`/api/alerts/${encodeURIComponent(id)}/read`),
  // Phase 3.5-D: Vessels
  vessels:             () => fetchJSON<Vessel[]>('/api/vessels'),
  // USGS Earthquakes
  earthquakes:         () => fetchJSON<Earthquake[]>('/api/earthquakes'),
  // System Health
  health:              () => fetchJSON<HealthResponse>('/api/health'),
  // CII + Polymarket + Focal Points
  cii:                 () => fetchJSON<any[]>('/api/cii'),
  polymarket:          () => fetchJSON<any[]>('/api/polymarket'),
  focalPoints:         () => fetchJSON<any[]>('/api/focal-points'),
  // Static GeoJSON Layers
  layerBases:          () => fetchJSON<GeoJSONCollection>('/api/layers/bases'),
  layerCables:         () => fetchJSON<GeoJSONCollection>('/api/layers/cables'),
  layerPipelines:      () => fetchJSON<GeoJSONCollection>('/api/layers/pipelines'),
  // Geo Convergence
  geoConvergence:      () => fetchJSON<ConvergenceHotspot[]>('/api/geo-convergence'),
  // Surge Detection
  surgeAlerts:         () => fetchJSON<SurgeAlert[]>('/api/surge-alerts'),
};
