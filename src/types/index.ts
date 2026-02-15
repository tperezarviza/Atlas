export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type Trend = 'escalating' | 'stable' | 'de-escalating';
export type ConnectionType = 'proxy_war' | 'arms_flow' | 'alliance' | 'spillover' | 'military' | 'cyber';
export type FeedCategory = 'trump' | 'leader' | 'musk' | 'military' | 'think_tank' | 'conservative' | 'state_media';
export type NuclearStatus = 'declared' | 'undeclared' | 'pursuing' | 'threshold' | 'none' | 'nato_sharing';
export type ArmedGroupType = 'jihadist' | 'separatist' | 'militia' | 'cartel' | 'insurgent' | 'state_proxy';
export type BillStatus = 'introduced' | 'committee' | 'passed_house' | 'passed_senate' | 'signed' | 'vetoed';
export type BillRelevance = 'defense' | 'immigration' | 'foreign_affairs' | 'intelligence' | 'trade' | 'other';
export type NominationStatus = 'pending' | 'confirmed' | 'rejected' | 'withdrawn';
export type EOStatus = 'active' | 'revoked' | 'challenged';
export type FlightCategory = 'fighter' | 'bomber' | 'transport' | 'tanker' | 'surveillance' | 'command' | 'helicopter' | 'unknown';
export type UkraineFrontSource = 'deepstatemap' | 'isw' | 'acled_static';
export type TweetPriority = 'flash' | 'urgent' | 'priority' | 'routine';
export type TweetCategory = 'crisis' | 'military' | 'geopolitical' | 'border' | 'osint' | 'trump';
export type CyberSeverity = 'critical' | 'high' | 'medium' | 'low';
export type EventSeverity = 'minor' | 'moderate' | 'severe' | 'extreme';
export type EconImpact = 'high' | 'medium' | 'low';
export type ChokepointStatus = 'normal' | 'elevated' | 'disrupted' | 'critical';
export type AlertPriority = 'flash' | 'urgent' | 'priority' | 'routine';
export type AlertSource = 'gdelt' | 'acled' | 'acled_spike' | 'ooni' | 'markets' | 'executive_orders' | 'usgs' | 'eonet' | 'trump' | 'twitter' | 'rss';
export type NewsBullet = 'critical' | 'high' | 'medium' | 'accent';
export type CalendarUrgency = 'today' | 'soon' | 'future';
export type SessionRegion = 'americas' | 'europe' | 'asia_pacific' | 'middle_east_africa';
export type SessionStatus = 'open' | 'closed' | 'pre_market' | 'after_hours';
export type SupplyRisk = 'critical' | 'high' | 'medium' | 'low';
export type MapLayerId = 'flights' | 'shipping' | 'internet' | 'nuclear' | 'armedGroups' | 'vessels' | 'naturalEvents' | 'earthquakes' | 'bases' | 'cables' | 'pipelines' | 'convergence';

export interface ConvergenceHotspot {
  id: string;
  lat: number;
  lng: number;
  gridLat: number;
  gridLng: number;
  eventTypes: string[];
  totalEvents: number;
  avgTone: number;
  score: number;
}

export interface NuclearFacility {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  type: string;
  status: string;
}

export interface SensitiveDate {
  month: number;
  day: number;
  title: string;
  detail: string;
  region: string;
  urgencyBoost: boolean;
}

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
  fsiScore?: number;
  fsiCategory?: string;
  corruptionIndex?: number;
  pressFreedom?: number;
  usRelationship?: string;
  recentEvents?: number;
  sentiment?: number;
  activeConflicts?: number;
  armedGroupCount?: number;
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

export interface CongressBill {
  number: string;
  title: string;
  sponsor: string;
  party: string;
  introduced_date: string;
  latest_action: string;
  latest_action_date: string;
  status: BillStatus;
  subjects: string[];
  committee: string;
  relevance: BillRelevance;
}

export interface SenateNomination {
  name: string;
  position: string;
  agency: string;
  status: NominationStatus;
  committee_vote_date?: string;
  floor_vote_date?: string;
}

export interface ExecutiveOrder {
  number: number;
  title: string;
  signing_date: string;
  publication_date: string;
  summary: string;
  topics: string[];
  federal_register_url: string;
  status: EOStatus;
}

export interface MilitaryFlight {
  icao24: string;
  callsign: string;
  origin_country: string;
  aircraft_type?: string;
  category: FlightCategory;
  lat: number;
  lng: number;
  altitude_m: number;
  velocity_ms: number;
  heading: number;
  on_ground: boolean;
  last_seen: number;
  region?: string;
}

export interface UkraineFrontData {
  source: UkraineFrontSource;
  front_line_geojson?: unknown;
  isw_map_image_url?: string;
  isw_assessment_text?: string;
  recent_events: { id: string; date: string; location: string; type: string; fatalities: number; lat: number; lng: number }[];
  territory_summary?: string;
  last_updated: string;
}

export interface TwitterIntelItem {
  id: string;
  text: string;
  author: { username: string; name: string; verified: boolean; followers_count: number };
  created_at: string;
  metrics: { retweet_count: number; reply_count: number; like_count: number; impression_count: number };
  category: TweetCategory;
  priority: TweetPriority;
  query_matched: string;
  url: string;
}

export interface CyberThreatPulse {
  id: string;
  name: string;
  description: string;
  adversary?: string;
  targeted_countries: string[];
  tags: string[];
  malware_families: string[];
  indicators_count: number;
  tlp: string;
  created: string;
  modified: string;
  severity: CyberSeverity;
}

export interface CyberIntelligence {
  active_threats: CyberThreatPulse[];
  summary: { total_active_threats: number; critical_threats: number; most_targeted_countries: string[]; most_active_adversaries: string[] };
}

export interface NaturalEvent {
  id: string;
  title: string;
  category: string;
  source: string;
  lat: number;
  lng: number;
  date: string;
  magnitude?: number;
  severity: EventSeverity;
  link: string;
}

export interface Alert {
  id: string;
  priority: AlertPriority;
  source: AlertSource;
  title: string;
  detail?: string;
  timestamp: string;
  read: boolean;
}

export interface EconomicEvent {
  date: string;
  time: string;
  currency: string;
  impact: EconImpact;
  event_name: string;
  actual?: string;
  forecast?: string;
  previous?: string;
}

export type VesselType = 'tanker' | 'cargo' | 'container' | 'military' | 'other';

export interface Vessel {
  id: string;
  name: string;
  mmsi: string;
  type: VesselType;
  flag: string;
  lat: number;
  lng: number;
  heading: number;
  speed_knots: number;
  destination?: string;
  near_chokepoint?: string;
}

export interface Earthquake {
  id: string;
  magnitude: number;
  place: string;
  time: string;
  lat: number;
  lng: number;
  depth: number;
  url: string;
  alert: string | null;
  tsunami: boolean;
}

export interface OFACSanction {
  id: string;
  title: string;
  date: string;
  program: string;
  url: string;
  summary: string;
}
