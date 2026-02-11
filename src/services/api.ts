const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const FETCH_TIMEOUT = 15_000; // 15 seconds
const POST_TIMEOUT = 60_000; // 60 seconds (AI generation can be slow)

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

async function postJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    signal: AbortSignal.timeout(POST_TIMEOUT),
  });
  if (!res.ok) throw new Error(`API POST ${path}: ${res.status}`);
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
  CDSSpread,
  StrategicDependency,
  CountryProfile,
  SanctionsResponse,
  ArmedGroup,
  Chokepoint,
  InternetIncident,
  HostilityPair,
  PropagandaEntry,
  ArmsTransfer,
  MilitarySpending,
  GTDSummary,
} from '../types';

export interface TopBarData {
  activeConflicts: number;
  criticalConflicts: number;
  btcPrice: string;
  oilPrice: string;
  borderEncounters: string;
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
  cds: CDSSpread[];
  macro: MacroItem[];
  border: BorderStat[];
}

// ── API functions ──

export const api = {
  topbar:      () => fetchJSON<TopBarData>('/api/topbar'),
  conflicts:   () => fetchJSON<Conflict[]>('/api/conflicts'),
  news:        () => fetchJSON<NewsPoint[]>('/api/news'),
  leaders:     () => fetchJSON<FeedItem[]>('/api/leaders'),
  markets:     () => fetchJSON<MarketsResponse>('/api/markets'),
  newswire:    () => fetchJSON<NewsWireItem[]>('/api/newswire'),
  calendar:    () => fetchJSON<CalendarEvent[]>('/api/calendar'),
  brief:       () => fetchJSON<BriefResponse>('/api/brief'),
  regenBrief:  () => postJSON<BriefResponse>('/api/brief/regenerate'),
  connections: () => fetchJSON<Connection[]>('/api/connections'),
  ticker:      () => fetchJSON<TickerItem[]>('/api/ticker'),
  dependencies:() => fetchJSON<StrategicDependency[]>('/api/dependencies'),
  // Phase 2.5-B: Intelligence Services
  countries:          () => fetchJSON<CountryProfile[]>('/api/countries'),
  country:      (code: string) => fetchJSON<CountryProfile>(`/api/countries/${code}`),
  sanctions:          () => fetchJSON<SanctionsResponse>('/api/sanctions'),
  armedGroups:        () => fetchJSON<ArmedGroup[]>('/api/armed-groups'),
  armedGroup:    (id: string) => fetchJSON<ArmedGroup>(`/api/armed-groups/${id}`),
  shipping:           () => fetchJSON<Chokepoint[]>('/api/shipping'),
  internetIncidents:  () => fetchJSON<InternetIncident[]>('/api/internet-incidents'),
  hostility:          () => fetchJSON<HostilityPair[]>('/api/hostility'),
  hostilityPair:(pair: string) => fetchJSON<HostilityPair>(`/api/hostility/${pair}`),
  propaganda:         () => fetchJSON<PropagandaEntry[]>('/api/propaganda'),
  propagandaCountry: (code: string) => fetchJSON<PropagandaEntry>(`/api/propaganda/${code}`),
  armsTransfers:      () => fetchJSON<ArmsTransfer[]>('/api/arms-transfers'),
  militarySpending:   () => fetchJSON<MilitarySpending[]>('/api/military-spending'),
  terrorismHistory:   () => fetchJSON<GTDSummary[]>('/api/terrorism/history'),
  terrorismGroup:(group: string) => fetchJSON<GTDSummary>(`/api/terrorism/history/${group}`),
};
