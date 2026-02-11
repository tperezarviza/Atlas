export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Trend = 'escalating' | 'stable' | 'de-escalating';
export type ConnectionType = 'proxy_war' | 'arms_flow' | 'alliance' | 'spillover' | 'military' | 'cyber';
export type FeedCategory = 'trump' | 'leader' | 'musk' | 'military';
export type NewsBullet = 'critical' | 'high' | 'medium' | 'accent';
export type CalendarUrgency = 'today' | 'soon' | 'future';

export interface Conflict {
  id: string;
  name: string;
  severity: Severity;
  lat: number;
  lng: number;
  region: string;
  casualties: string;
  displaced: string;
  trend: Trend;
  since: string;
}

export interface NewsPoint {
  id: string;
  lat: number;
  lng: number;
  tone: number;
  headline: string;
  source: string;
  category: string;
}

export interface FeedItem {
  id: string;
  flag: string;
  handle: string;
  role: string;
  source: string;
  time: string;
  category: FeedCategory;
  text: string;
  engagement: string;
  tags: string[];
}

export interface MarketItem {
  name: string;
  price: string;
  delta: string;
  direction: 'up' | 'down' | 'flat';
  sparkData: number[];
  color?: string;
}

export interface MarketSection {
  title: string;
  icon: string;
  items: MarketItem[];
}

export interface MacroItem {
  label: string;
  value: string;
  color?: string;
}

export interface BorderStat {
  label: string;
  value: string;
  delta?: string;
  color?: string;
}

export interface NewsWireItem {
  id: string;
  bullet: NewsBullet;
  source: string;
  time: string;
  headline: string;
  tone: number;
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  urgency: CalendarUrgency;
}

export interface Connection {
  id: string;
  from: [number, number];
  to: [number, number];
  type: ConnectionType;
  label: string;
}

export interface TickerItem {
  id: string;
  bulletColor: string;
  source: string;
  text: string;
}

export interface BriefResponse {
  html: string;
  generatedAt: string;
  model: string;
  sources: string[];
}

export interface TopBarData {
  activeConflicts: number;
  criticalConflicts: number;
  btcPrice: string;
  oilPrice: string;
  borderEncounters: string;
  threatLevel: string;
}

export interface HealthStatus {
  status: string;
  uptime: number;
  caches: Record<string, { fresh: boolean; age: number | null }>;
}
