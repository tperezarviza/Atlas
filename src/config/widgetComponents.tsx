import type { ComponentType } from 'react';
import type { FeedItem, NewsWireItem, PropagandaEntry, HostilityPair } from '../types';
import type { ViewId } from '../types/views';

import LeaderFeed from '../components/LeaderFeed';
import MarketsDashboard from '../components/MarketsDashboard';
import NewsWire from '../components/NewsWire';
import IntelMonitor from '../components/IntelMonitor';
import AIBrief from '../components/AIBrief';
import GlobalNarratives from '../components/GlobalNarratives';
import UkraineWarMetrics from '../components/tabs/UkraineWarMetrics';
import RussianMilitaryActivity from '../components/tabs/RussianMilitaryActivity';
import NatoResponse from '../components/tabs/NatoResponse';
import ExecutiveOrdersList from '../components/tabs/ExecutiveOrdersList';
import CongressTracker from '../components/tabs/CongressTracker';
import InternetFreedomPanel from '../components/tabs/InternetFreedomPanel';

// ── Filter functions ──

const meNewsFilter = (item: NewsWireItem) =>
  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae/i.test(item.headline);

const ukraineNewsFilter = (item: NewsWireItem) =>
  /ukraine|kyiv|kharkiv|donetsk|crimea|zelensky|putin.*war|russian.*force/i.test(item.headline);

const domesticNewsFilter = (item: NewsWireItem) =>
  /trump|congress|senate|border|immigration|tariff|doge|executive order|white house|supreme court/i.test(item.headline);

const ukraineLeaderFilter = (item: FeedItem) =>
  /ukraine|zelensky|putin|nato|pentagon|kharkiv|donetsk|crimea|rubio/i.test(item.text + item.tags.join(' '));

const trumpFeedFilter = (item: FeedItem) =>
  item.category === 'trump' || item.category === 'conservative' || /white house|cabinet|doge/i.test(item.text);

const meLeaderFilter = (item: FeedItem) =>
  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae|netanyahu|khamenei|mbs/i.test(item.text + item.tags.join(' '));

const intelLeaderFilter = (item: FeedItem) =>
  /cyber|hack|apt|ransomware|malware|espionage|intelligence|nsa|cia|mi6|mossad|fsb|gru|sigint|surveillance|zero.day|exploit|breach/i.test(item.text + item.tags.join(' '));

const ME_CODES = new Set(['IR', 'IL', 'SA', 'SY', 'IQ', 'YE', 'LB', 'EG', 'JO', 'PS', 'TR', 'QA', 'AE', 'BH', 'KW', 'OM']);

const mePropagandaFilter = (entry: PropagandaEntry) => ME_CODES.has(entry.countryCode);
const meHostilityFilter = (pair: HostilityPair) => ME_CODES.has(pair.codeA) || ME_CODES.has(pair.codeB);

const meIntelFilter = (event: { title: string; detail: string }) =>
  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae|middle east/i.test(event.title + event.detail);

// ── Focus mapping (ViewId -> AI Brief focus) ──

const VIEW_FOCUS: Record<ViewId, string | undefined> = {
  global: undefined,
  mideast: 'mideast',
  ukraine: 'ukraine',
  domestic: 'domestic',
  intel: 'intel',
};

// ── Widget context for rendering ──

export interface WidgetContext {
  activeView: ViewId;
  conflicts: import('../types').Conflict[] | null;
  conflictsLoading: boolean;
  conflictsError: Error | null;
  conflictsLastUpdate: Date | null;
  selectedConflictId: string | null;
  onSelectConflict: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetEntry = ComponentType<any>;

const WIDGET_MAP: Record<string, WidgetEntry> = {
  'leader-feed': LeaderFeed,
  'markets': MarketsDashboard,
  'newswire': NewsWire,
  'intel-monitor': IntelMonitor,
  'ai-brief': AIBrief,
  'global-narratives': GlobalNarratives,
  'ukraine-leader': LeaderFeed,
  'ukraine-metrics': UkraineWarMetrics,
  'russian-military': RussianMilitaryActivity,
  'nato-response': NatoResponse,
  'trump-feed': LeaderFeed,
  'executive-orders': ExecutiveOrdersList,
  'congress-tracker': CongressTracker,
  'internet-freedom': InternetFreedomPanel,
  'newswire-me': NewsWire,
  'newswire-ua': NewsWire,
  'newswire-domestic': NewsWire,
  'leader-feed-me': LeaderFeed,
  'leader-feed-intel': LeaderFeed,
  'intel-monitor-me': IntelMonitor,
  'narratives-me': GlobalNarratives,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWidgetProps(widgetId: string, ctx: WidgetContext): Record<string, any> {
  switch (widgetId) {
    case 'leader-feed':
      return {};
    case 'ukraine-leader':
      return { filter: ukraineLeaderFilter, title: 'Ukraine Intel' };
    case 'trump-feed':
      return { filter: trumpFeedFilter, title: 'Trump Feed' };
    case 'leader-feed-me':
      return { filter: meLeaderFilter, title: 'Middle East Intel' };
    case 'leader-feed-intel':
      return { filter: intelLeaderFilter, title: 'Cyber & Intel Feed' };
    case 'intel-monitor-me':
      return { filter: meIntelFilter, title: 'Intel: Middle East' };
    case 'narratives-me':
      return { propagandaFilter: mePropagandaFilter, hostilityFilter: meHostilityFilter, title: 'Narratives: Middle East' };
    case 'newswire':
      return {};
    case 'newswire-me':
      return { filter: meNewsFilter, title: 'Breaking: Middle East' };
    case 'newswire-ua':
      return { filter: ukraineNewsFilter, title: 'Breaking: Ukraine' };
    case 'newswire-domestic':
      return { filter: domesticNewsFilter, title: 'Breaking: Domestic' };
    case 'ai-brief':
      return { focus: VIEW_FOCUS[ctx.activeView] };
    default:
      return {};
  }
}

export function getWidgetComponent(widgetId: string): WidgetEntry | null {
  return WIDGET_MAP[widgetId] ?? null;
}
