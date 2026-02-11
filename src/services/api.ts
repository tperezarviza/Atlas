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
};
