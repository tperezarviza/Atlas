import { lazy, Suspense, type ComponentType } from 'react';
import type { FeedItem, NewsWireItem } from '../types';
import type { ContextId } from '../hooks/useContextRotation';

// ── All widget components lazy-loaded ──
const LeaderFeed = lazy(() => import('../components/LeaderFeed'));
const MarketsDashboard = lazy(() => import('../components/MarketsDashboard'));
const NewsWire = lazy(() => import('../components/NewsWire'));
const AIBrief = lazy(() => import('../components/AIBrief'));
const CIIDashboard = lazy(() => import('../components/CIIDashboard'));
const PolymarketPanel = lazy(() => import('../components/PolymarketPanel'));
const IntelCenterRight = lazy(() => import('../components/IntelCenterRight'));

// ── Filter functions per context ──

const meLeaderFilter = (item: FeedItem) =>
  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae|netanyahu|khamenei|mbs/i.test(item.text + item.tags.join(' '));

const ukraineLeaderFilter = (item: FeedItem) =>
  /ukraine|zelensky|putin|nato|pentagon|kharkiv|donetsk|crimea|rubio/i.test(item.text + item.tags.join(' '));

const trumpFeedFilter = (item: FeedItem) =>
  item.category === 'trump' || item.category === 'conservative' || /white house|cabinet|doge/i.test(item.text);

const intelLeaderFilter = (item: FeedItem) =>
  /cyber|hack|apt|ransomware|malware|espionage|intelligence|nsa|cia|mi6|mossad|fsb|gru|sigint|surveillance|zero.day|exploit|breach/i.test(item.text + item.tags.join(' '));

const meNewsFilter = (item: NewsWireItem) =>
  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae/i.test(item.headline);

const ukraineNewsFilter = (item: NewsWireItem) =>
  /ukraine|kyiv|kharkiv|donetsk|crimea|zelensky|putin.*war|russian.*force/i.test(item.headline);

const domesticNewsFilter = (item: NewsWireItem) =>
  /trump|congress|senate|border|immigration|tariff|doge|executive order|white house|supreme court/i.test(item.headline);

const intelNewsFilter = (item: NewsWireItem) =>
  /cyber|hack|espionage|intelligence|surveillance|breach|malware|ransomware|apt|nsa|cia|mi6|mossad|fsb|gru/i.test(item.headline);

// ── Context → filter mappings ──

const LEADER_FILTERS: Record<ContextId, { filter?: (item: FeedItem) => boolean; title?: string }> = {
  global:   {},
  mideast:  { filter: meLeaderFilter, title: 'Middle East Intel' },
  ukraine:  { filter: ukraineLeaderFilter, title: 'Ukraine Intel' },
  domestic: { filter: trumpFeedFilter, title: 'Trump Feed' },
  intel:    { filter: intelLeaderFilter, title: 'Cyber & Intel Feed' },
};

const NEWS_FILTERS: Record<ContextId, { filter?: (item: NewsWireItem) => boolean; title?: string }> = {
  global:   {},
  mideast:  { filter: meNewsFilter, title: 'Breaking: Middle East' },
  ukraine:  { filter: ukraineNewsFilter, title: 'Breaking: Ukraine' },
  domestic: { filter: domesticNewsFilter, title: 'Breaking: Domestic' },
  intel:    { filter: intelNewsFilter, title: 'Breaking: Intel' },
};

const BRIEF_FOCUS: Record<ContextId, string | undefined> = {
  global: undefined,
  mideast: 'mideast',
  ukraine: 'ukraine',
  domestic: 'domestic',
  intel: 'intel',
};

// ── Widget context for rendering ──

export interface WidgetContext {
  contextId: ContextId;
  conflicts: import('../types').Conflict[] | null;
  conflictsLoading: boolean;
  conflictsError: Error | null;
  conflictsLastUpdate: Date | null;
  selectedConflictId: string | null;
  onSelectConflict: (id: string) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WidgetEntry = ComponentType<any>;

// ── Suspense wrapper for lazy components ──
function withSuspense(LazyComponent: WidgetEntry): WidgetEntry {
  return function SuspenseWrapper(props) {
    return (
      <Suspense fallback={<div className="h-full w-full animate-pulse" style={{ background: 'rgba(255,200,50,0.03)' }} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

const W = {
  LeaderFeed: withSuspense(LeaderFeed),
  MarketsDashboard: withSuspense(MarketsDashboard),
  NewsWire: withSuspense(NewsWire),
  AIBrief: withSuspense(AIBrief),
  CIIDashboard: withSuspense(CIIDashboard),
  PolymarketPanel: withSuspense(PolymarketPanel),
  IntelCenterRight: withSuspense(IntelCenterRight),
};

const WIDGET_MAP: Record<string, WidgetEntry> = {
  'leader-feed': W.LeaderFeed,
  'markets': W.MarketsDashboard,
  'newswire': W.NewsWire,
  'ai-brief': W.AIBrief,
  'cii-dashboard': W.CIIDashboard,
  'polymarket': W.PolymarketPanel,
  'intel-center-right': W.IntelCenterRight,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getWidgetProps(widgetId: string, ctx: WidgetContext): Record<string, any> {
  switch (widgetId) {
    case 'leader-feed':
      return LEADER_FILTERS[ctx.contextId] ?? {};
    case 'newswire':
      return NEWS_FILTERS[ctx.contextId] ?? {};
    case 'ai-brief':
      return { focus: BRIEF_FOCUS[ctx.contextId] };
    case 'cii-dashboard':
      return { contextId: ctx.contextId };
    case 'markets':
    case 'polymarket':
    default:
      return {};
  }
}

export function getWidgetComponent(widgetId: string): WidgetEntry | null {
  return WIDGET_MAP[widgetId] ?? null;
}
