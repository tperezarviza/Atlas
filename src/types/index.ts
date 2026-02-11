export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Trend = 'escalating' | 'stable' | 'de-escalating';
export type ConnectionType = 'proxy_war' | 'arms_flow' | 'alliance' | 'spillover' | 'military' | 'cyber';
export type FeedCategory = 'trump' | 'leader' | 'musk' | 'military' | 'think_tank' | 'conservative' | 'state_media';
export type NuclearStatus = 'declared' | 'undeclared' | 'pursuing' | 'threshold' | 'none' | 'nato_sharing';
export type ArmedGroupType = 'jihadist' | 'separatist' | 'militia' | 'cartel' | 'insurgent' | 'state_proxy';
export type ChokepointStatus = 'normal' | 'elevated' | 'disrupted' | 'critical';
export type NewsBullet = 'critical' | 'high' | 'medium' | 'accent';
export type CalendarUrgency = 'today' | 'soon' | 'future';
export type SessionRegion = 'americas' | 'europe' | 'asia_pacific' | 'middle_east_africa';
export type SessionStatus = 'open' | 'closed' | 'pre_market' | 'after_hours';
export type SupplyRisk = 'critical' | 'high' | 'medium' | 'low';

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

export interface MarketSession {
  region: SessionRegion;
  label: string;
  status: SessionStatus;
  opensAt: string;
  closesAt: string;
  nextEvent: string;
}

export interface CDSSpread {
  country: string;
  code: string;
  spread5Y: number;
  change: number;
  direction: 'up' | 'down' | 'flat';
  rating: string;
}

export interface StrategicDependency {
  resource: string;
  icon: string;
  topProducer: string;
  topProducerShare: string;
  usImportDep: string;
  supplyRisk: SupplyRisk;
  notes: string;
}

export interface CountryProfile {
  code: string;
  name: string;
  flag: string;
  region: string;
  capital: string;
  population: number;
  gdp: number;
  government: string;
  leader: string;
  leaderTitle: string;
  military: {
    activePersonnel: number;
    reservePersonnel: number;
    nuclearStatus: NuclearStatus;
    branches: string[];
  };
  alliances: string[];
  sanctioned: boolean;
  sanctionPrograms: string[];
  recentEvents?: number;
  sentiment?: number;
  cdsSpread?: number;
  activeConflicts?: number;
}

export interface SanctionEntry {
  id: string;
  name: string;
  type: string;
  programs: string[];
  country: string;
  remarks: string;
  dateAdded?: string;
}

export interface SanctionsResponse {
  totalEntries: number;
  byProgram: Record<string, number>;
  byCountry: Record<string, number>;
  recentEntries: SanctionEntry[];
  lastUpdated: string;
}

export interface ArmedGroup {
  id: string;
  name: string;
  aliases: string[];
  type: ArmedGroupType;
  ideology: string;
  status: string;
  foundedYear: number;
  regions: string[];
  countries: string[];
  estimatedStrength: string;
  leadership: string;
  stateSponsors?: string[];
  designations: string[];
  notableAttacks: string[];
  acledActorNames?: string[];
  recentEvents?: number;
}

export interface Chokepoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  region: string;
  dailyVessels: number;
  oilFlowMbpd: number;
  globalTradePercent: number;
  status: ChokepointStatus;
  statusReason?: string;
  nearbyVessels?: number | null;
  recentIncidents?: string[];
}

export interface InternetIncident {
  id: string;
  country: string;
  countryCode: string;
  title: string;
  startDate: string;
  endDate?: string;
  asns?: string[];
  shortDescription: string;
  eventType: string;
}

export interface HostilityPair {
  id: string;
  countryA: string;
  codeA: string;
  countryB: string;
  codeB: string;
  avgTone: number;
  articleCount: number;
  trend: Severity;
  topHeadlines: string[];
}

export interface PropagandaEntry {
  id: string;
  country: string;
  countryCode: string;
  outlet: string;
  domain: string;
  narratives: string[];
  sampleHeadlines: string[];
  toneAvg: number;
  articleCount: number;
  analysisDate: string;
}

export interface ArmsTransfer {
  supplier: string;
  recipient: string;
  year: number;
  description: string;
  tivValue: number;
  category: string;
}

export interface MilitarySpending {
  country: string;
  code: string;
  year: number;
  spendingUsd: number;
  gdpPercent: number;
  rank: number;
  change1yr: number;
}

export interface GTDSummary {
  groupName: string;
  totalIncidents: number;
  totalKilled: number;
  totalWounded: number;
  activeYears: string;
  peakYear: number;
  peakIncidents: number;
  primaryRegions: string[];
  primaryTactics: string[];
  yearlyData: { year: number; incidents: number; killed: number }[];
}
