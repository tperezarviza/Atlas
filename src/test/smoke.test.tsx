import { vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ──

// Mock useApiData so components don't trigger async fetches (eliminates act() warnings)
const mockRefetch = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/useApiData', () => ({
  useApiData: vi.fn(() => ({
    data: null,
    loading: false,
    error: null,
    lastUpdate: null,
    refetch: mockRefetch,
  })),
}));

// Mock useClock
vi.mock('../hooks/useClock', () => ({
  useClock: () => ({
    utc: '12:00:00',
    buenosAires: '09:00:00',
    zones: [
      { label: 'BUE', time: '09:00' },
      { label: 'DC', time: '07:00' },
      { label: 'UTC', time: '12:00' },
      { label: 'LON', time: '12:00' },
      { label: 'MSK', time: '15:00' },
      { label: 'BEI', time: '20:00' },
      { label: 'TEH', time: '15:30' },
    ],
  }),
}));

// Mock react-resizable-panels (v4 API: Group, Panel, Separator)
vi.mock('react-resizable-panels', () => ({
  Group: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
    const { orientation: _o, defaultLayout: _dl, onLayoutChange: _olc, onLayoutChanged: _olcd, ...rest } = props;
    return <div data-testid="panel-group" {...rest}>{children}</div>;
  },
  Panel: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => {
    const { defaultSize: _ds, minSize: _ms, maxSize: _mxs, collapsible: _c, collapsedSize: _cs, onResize: _or, panelRef: _pr, ...rest } = props;
    return <div data-testid="panel" {...rest}>{children}</div>;
  },
  Separator: (props: { [key: string]: unknown }) => {
    const { disabled: _d, ...rest } = props;
    return <div data-testid="resize-handle" {...rest} />;
  },
  useDefaultLayout: () => ({
    defaultLayout: undefined,
    onLayoutChange: vi.fn(),
    onLayoutChanged: vi.fn(),
  }),
  usePanelRef: () => ({ current: { collapse: vi.fn(), expand: vi.fn(), isCollapsed: vi.fn(() => false), getSize: vi.fn(() => ({ asPercentage: 50, inPixels: 500 })), resize: vi.fn() } }),
  usePanelCallbackRef: () => [null, vi.fn()],
  useGroupRef: () => ({ current: null }),
  useGroupCallbackRef: () => [null, vi.fn()],
}));

// Mock react-leaflet since jsdom has no real map rendering
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Polyline: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GeoJSON: () => null,
  useMap: () => ({ invalidateSize: vi.fn(), flyTo: vi.fn(), on: vi.fn(), off: vi.fn(), getZoom: vi.fn(() => 2.5), getContainer: vi.fn(() => document.createElement('div')) }),
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    DomEvent: { stopPropagation: vi.fn() },
  },
}));

// Mock DOMPurify for AIBrief
vi.mock('dompurify', () => ({
  default: {
    sanitize: vi.fn((html: string) => html),
  },
}));

// Mock the API module
vi.mock('../services/api', () => ({
  api: {
    topbar: vi.fn(),
    conflicts: vi.fn(),
    news: vi.fn(),
    leaders: vi.fn(),
    markets: vi.fn(),
    newswire: vi.fn(),
    calendar: vi.fn(),
    brief: vi.fn(),
    regenBrief: vi.fn(),
    connections: vi.fn(),
    ticker: vi.fn(),
    alerts: vi.fn(),
    markAlertRead: vi.fn().mockResolvedValue({ ok: true }),
    country: vi.fn(),
    armedGroups: vi.fn(),
    shipping: vi.fn(),
    ukraineFront: vi.fn(),
    militaryFlights: vi.fn(),
    executiveOrders: vi.fn(),
    congressBills: vi.fn(),
    congressNominations: vi.fn(),
    propaganda: vi.fn(),
    hostility: vi.fn(),
    internetIncidents: vi.fn(),
    dependencies: vi.fn(),
    twitterIntel: vi.fn(),
    twitterTrending: vi.fn(),
    cyberIntel: vi.fn(),
    cyberThreats: vi.fn(),
    naturalEvents: vi.fn(),
    economicCalendar: vi.fn(),
    vessels: vi.fn(),
    health: vi.fn(),
  },
}));

import { useApiData } from '../hooks/useApiData';
import App from '../App';
import TopBar from '../components/TopBar';
import LeaderFeed from '../components/LeaderFeed';
import WorldMap from '../components/WorldMap';
import MapLegend from '../components/MapLegend';
import MarketsDashboard from '../components/MarketsDashboard';
import NewsWire from '../components/NewsWire';
import DiplomaticCalendar from '../components/DiplomaticCalendar';
import AIBrief from '../components/AIBrief';
import Ticker from '../components/Ticker';
import ErrorBoundary from '../components/ErrorBoundary';
import AlertBanner from '../components/AlertBanner';
import TabPanel from '../components/tabs/TabPanel';
import NatoResponse from '../components/tabs/NatoResponse';
import ExecutiveOrdersList from '../components/tabs/ExecutiveOrdersList';
import CongressTracker from '../components/tabs/CongressTracker';
import IntelMonitor from '../components/IntelMonitor';
import GlobalNarratives from '../components/GlobalNarratives';
import EventTimeline from '../components/EventTimeline';
import StrategicDepsViz from '../components/StrategicDepsViz';
import InternetFreedomPanel from '../components/tabs/InternetFreedomPanel';
import EconomicCalendarTab from '../components/EconomicCalendarTab';
import { mockConflicts } from '../data/mockConflicts';

const mockUseApiData = vi.mocked(useApiData);

describe('ATLAS Dashboard Tests', () => {

beforeEach(() => {
  vi.clearAllMocks();
  // Skip boot sequence in tests
  sessionStorage.setItem('atlas-booted', '1');
  // matchMedia mock for kiosk mode
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
  mockUseApiData.mockReturnValue({
    data: null,
    loading: false,
    error: null,
    lastUpdate: null,
    refetch: mockRefetch,
  });
});

// ── App ──

describe('App', () => {
  it('renders full layout with grid structure', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all major sections on GLOBAL tab', () => {
    render(<App />);
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText(/Leader Feed/)).toBeInTheDocument();
    expect(screen.getByText(/Markets & Indicators/)).toBeInTheDocument();
    expect(screen.getByText(/Breaking Wire/)).toBeInTheDocument();
    expect(screen.getByText(/Intel Monitor/)).toBeInTheDocument();
    expect(screen.getByText(/AI Intelligence Brief/)).toBeInTheDocument();
  });

  it('renders tab buttons including INTEL', () => {
    render(<App />);
    expect(screen.getByText(/GLOBAL/)).toBeInTheDocument();
    expect(screen.getByText(/MIDEAST/)).toBeInTheDocument();
    expect(screen.getByText(/UKRAINE/)).toBeInTheDocument();
    expect(screen.getByText(/DOMESTIC/)).toBeInTheDocument();
    expect(screen.getByText(/INTEL/)).toBeInTheDocument();
  });

  it('switches to MIDEAST tab and shows MIDEAST components', () => {
    render(<App />);
    const mideastBtn = screen.getByText(/MIDEAST/);
    fireEvent.click(mideastBtn);
    // Mideast now uses same Leader Feed + Markets + Intel Monitor
    expect(screen.getByText(/Leader Feed/)).toBeInTheDocument();
    expect(screen.getByText(/Intel Monitor/)).toBeInTheDocument();
  });

  it('switches to DOMESTIC tab and shows DOMESTIC components', () => {
    render(<App />);
    const domesticBtn = screen.getByText(/DOMESTIC/);
    fireEvent.click(domesticBtn);
    expect(screen.getByText(/Executive Orders/)).toBeInTheDocument();
    expect(screen.getByText(/Polling Dashboard/)).toBeInTheDocument();
  });

  it('switches to INTEL tab', () => {
    render(<App />);
    const intelBtn = screen.getByText(/INTEL/);
    fireEvent.click(intelBtn);
    expect(screen.getByText(/Leader Feed/)).toBeInTheDocument();
    expect(screen.getByText(/Intel Monitor/)).toBeInTheDocument();
  });
});

// ── TopBar ──

describe('TopBar', () => {
  it('renders logo and LIVE badge', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders BUE and DC clocks', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.getByText('BUE')).toBeInTheDocument();
    expect(screen.getByText('DC')).toBeInTheDocument();
  });

  it('renders tab buttons including INTEL', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.getByText(/GLOBAL/)).toBeInTheDocument();
    expect(screen.getByText(/MIDEAST/)).toBeInTheDocument();
    expect(screen.getByText(/UKRAINE/)).toBeInTheDocument();
    expect(screen.getByText(/DOMESTIC/)).toBeInTheDocument();
    expect(screen.getByText(/INTEL/)).toBeInTheDocument();
  });

  it('renders 2 KPI placeholders when no data', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBe(4); // 2 labels + 2 values
  });

  it('renders only 2 KPIs when data is provided', () => {
    mockUseApiData.mockReturnValue({
      data: {
        kpis: [
          { label: 'Active Conflicts', value: '19', colorClass: 'text-critical' },
          { label: 'Critical', value: '3', colorClass: 'text-critical' },
          { label: 'BTC', value: '$97,234', colorClass: 'text-positive' },
          { label: 'WTI Oil', value: '$72.34', colorClass: 'text-medium' },
        ],
        threatLevel: 'HIGH',
      },
      loading: false,
      error: null,
      lastUpdate: new Date(),
      refetch: mockRefetch,
    });
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.getByText('Active Conflicts')).toBeInTheDocument();
    expect(screen.getByText('19')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    // 3rd and 4th KPIs should NOT be rendered
    expect(screen.queryByText('$97,234')).not.toBeInTheDocument();
  });

  it('calls onViewChange when tab button is clicked', () => {
    const onViewChange = vi.fn();
    render(<TopBar activeView="global" onViewChange={onViewChange} />);
    fireEvent.click(screen.getByText(/MIDEAST/));
    expect(onViewChange).toHaveBeenCalledWith('mideast');
  });

  it('does not render bell icon (removed)', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.queryByText('🔔')).not.toBeInTheDocument();
  });

  it('does not render threat level (removed)', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.queryByText('THREAT')).not.toBeInTheDocument();
  });

  it('does not render doomsday clock (removed)', () => {
    render(<TopBar activeView="global" onViewChange={() => {}} />);
    expect(screen.queryByText(/DOOMSDAY/)).not.toBeInTheDocument();
  });
});

// ── TabPanel ──

describe('TabPanel', () => {
  it('renders children', () => {
    render(<TabPanel tabKey="test"><div>Tab Content</div></TabPanel>);
    expect(screen.getByText('Tab Content')).toBeInTheDocument();
  });

  it('changes key on rerender', () => {
    const { rerender } = render(<TabPanel tabKey="a"><div>Content A</div></TabPanel>);
    rerender(<TabPanel tabKey="b"><div>Content B</div></TabPanel>);
    expect(screen.getByText('Content B')).toBeInTheDocument();
  });
});

// ── LeaderFeed ──

describe('LeaderFeed', () => {
  it('renders header and mock data fallback', () => {
    render(<LeaderFeed />);
    expect(screen.getByText(/Leader Feed/)).toBeInTheDocument();
    expect(screen.getByText('@realDonaldTrump')).toBeInTheDocument();
    expect(screen.getByText('@elonmusk')).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<LeaderFeed title="Ukraine Intel" />);
    expect(screen.getByText(/Ukraine Intel/)).toBeInTheDocument();
  });

  it('renders MOCK badge when no live data', () => {
    render(<LeaderFeed />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
  });

  it('renders bold text safely (no dangerouslySetInnerHTML)', () => {
    render(<LeaderFeed />);
    const bold = screen.getByText('TARIFFS');
    expect(bold.tagName).toBe('STRONG');
  });

  it('does not render sub-tabs (removed)', () => {
    render(<LeaderFeed />);
    expect(screen.queryByText('TRUMP')).not.toBeInTheDocument();
    expect(screen.queryByText('LEADERS')).not.toBeInTheDocument();
    expect(screen.queryByText('THINK TANKS')).not.toBeInTheDocument();
    expect(screen.queryByText('X-OSINT')).not.toBeInTheDocument();
    expect(screen.queryByText('STATE MEDIA')).not.toBeInTheDocument();
  });

  it('shows ERROR badge on fetch error with no data', () => {
    mockUseApiData.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('Network error'),
      lastUpdate: null,
      refetch: mockRefetch,
    });
    render(<LeaderFeed />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load feed/)).toBeInTheDocument();
  });
});

// ── WorldMap ──

describe('WorldMap', () => {
  it('renders map container', () => {
    render(<WorldMap selectedConflictId="c1" onSelectConflict={() => {}} conflicts={null} conflictsLoading={false} conflictsError={null} conflictsLastUpdate={null} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('renders mock conflict tooltips when no data', () => {
    render(<WorldMap selectedConflictId={null} onSelectConflict={() => {}} conflicts={null} conflictsLoading={false} conflictsError={null} conflictsLastUpdate={null} />);
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
  });

  it('accepts viewCenter and viewZoom props', () => {
    render(
      <WorldMap
        selectedConflictId={null}
        onSelectConflict={() => {}}
        conflicts={null}
        conflictsLoading={false}
        conflictsError={null}
        conflictsLastUpdate={null}
        viewCenter={[28, 42]}
        viewZoom={5}
      />
    );
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('shows FEED ERROR when there are errors', () => {
    render(
      <WorldMap
        selectedConflictId={null}
        onSelectConflict={() => {}}
        conflicts={null}
        conflictsLoading={false}
        conflictsError={new Error('fail')}
        conflictsLastUpdate={null}
      />
    );
    expect(screen.getByText('FEED ERROR')).toBeInTheDocument();
  });
});

// ── MapLegend ──

describe('MapLegend', () => {
  const defaultLayers = { flights: true, shipping: false, internet: false, nuclear: false, armedGroups: false, vessels: false, naturalEvents: false, earthquakes: false } as const;
  const mockToggle = vi.fn();

  it('renders and shows layers', () => {
    render(<MapLegend layers={defaultLayers} onToggle={mockToggle} />);
    expect(screen.getByText(/Map Layers/)).toBeInTheDocument();
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
    expect(screen.getByText(/Toggle Layers/)).toBeInTheDocument();
  });

  it('toggles legend visibility on click', () => {
    render(<MapLegend layers={defaultLayers} onToggle={mockToggle} />);
    const header = screen.getByText(/Map Layers/);
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText(/News: Crisis/)).not.toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
  });

  it('renders toggle layer buttons', () => {
    render(<MapLegend layers={defaultLayers} onToggle={mockToggle} />);
    expect(screen.getByText('Military Flights')).toBeInTheDocument();
    expect(screen.getByText('Shipping Chokepoints')).toBeInTheDocument();
    expect(screen.getByText('Internet Shutdowns')).toBeInTheDocument();
    expect(screen.getByText('Nuclear Facilities')).toBeInTheDocument();
    expect(screen.getByText('Armed Groups')).toBeInTheDocument();
  });

  it('calls onToggle when layer toggle is clicked', () => {
    render(<MapLegend layers={defaultLayers} onToggle={mockToggle} />);
    fireEvent.click(screen.getByText('Military Flights'));
    expect(mockToggle).toHaveBeenCalledWith('flights');
  });
});

// ── MarketsDashboard ──

describe('MarketsDashboard', () => {
  it('renders header and mock sections', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText(/Markets & Indicators/)).toBeInTheDocument();
  });

  it('shows MOCK badge with no live data', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
  });

  it('shows ERROR badge on error', () => {
    mockUseApiData.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('API failed'),
      lastUpdate: null,
      refetch: mockRefetch,
    });
    render(<MarketsDashboard />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load markets/)).toBeInTheDocument();
  });
});

// ── NewsWire ──

describe('NewsWire', () => {
  it('renders header and mock items', () => {
    render(<NewsWire />);
    expect(screen.getByText(/Breaking Wire/)).toBeInTheDocument();
    expect(screen.getByText(/Russia launches massive missile barrage/)).toBeInTheDocument();
  });

  it('renders with custom title', () => {
    render(<NewsWire title="Breaking: Middle East" />);
    expect(screen.getByText(/Breaking: Middle East/)).toBeInTheDocument();
  });

  it('renders tone indicators', () => {
    render(<NewsWire />);
    expect(screen.getByText(/-9.1/)).toBeInTheDocument();
    expect(screen.getByText(/\+2.8/)).toBeInTheDocument();
  });

  it('shows Mock badge with no live data', () => {
    render(<NewsWire />);
    expect(screen.getByText('Mock')).toBeInTheDocument();
  });
});

// ── DiplomaticCalendar ──

describe('DiplomaticCalendar', () => {
  it('renders header and mock events', () => {
    render(<DiplomaticCalendar />);
    expect(screen.getByText('📅 Diplomatic Calendar')).toBeInTheDocument();
    expect(screen.getByText('EU Foreign Affairs Council')).toBeInTheDocument();
    expect(screen.getByText('Munich Security Conference')).toBeInTheDocument();
  });

  it('shows Mock badge with no live data', () => {
    render(<DiplomaticCalendar />);
    expect(screen.getByText('Mock')).toBeInTheDocument();
  });

  it('shows ERROR on error with no data', () => {
    mockUseApiData.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('calendar fail'),
      lastUpdate: null,
      refetch: mockRefetch,
    });
    render(<DiplomaticCalendar />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load calendar/)).toBeInTheDocument();
  });
});

// ── AIBrief ──

describe('AIBrief', () => {
  it('shows loading state when no data', () => {
    render(<AIBrief />);
    expect(screen.getByText(/AI Intelligence Brief/)).toBeInTheDocument();
    expect(screen.getByText('Loading brief...')).toBeInTheDocument();
  });

  it('shows focused header when focus prop is set', () => {
    render(<AIBrief focus="mideast" />);
    expect(screen.getByText(/AI Brief: MIDEAST/)).toBeInTheDocument();
  });

  it('shows error state when fetch fails', () => {
    mockUseApiData.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('brief fetch failed'),
      lastUpdate: null,
      refetch: mockRefetch,
    });
    render(<AIBrief />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load brief/)).toBeInTheDocument();
  });

  it('renders brief content when data available', () => {
    mockUseApiData.mockReturnValue({
      data: { html: '<p>Test brief content</p>', generatedAt: '2026-01-01T00:00', model: 'claude', sources: ['GDELT'] },
      loading: false,
      error: null,
      lastUpdate: new Date(),
      refetch: mockRefetch,
    });
    render(<AIBrief />);
    expect(screen.getByText('Test brief content')).toBeInTheDocument();
    expect(screen.getByText('ATLAS AI')).toBeInTheDocument();
  });

  it('shows STALE badge when data exists but refresh failed', () => {
    mockUseApiData.mockReturnValue({
      data: { html: '<p>Old data</p>', generatedAt: '2026-01-01T00:00', model: 'claude', sources: [] },
      loading: false,
      error: new Error('refresh failed'),
      lastUpdate: new Date(),
      refetch: mockRefetch,
    });
    render(<AIBrief />);
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });

  it('has a stable render (no crash on rerender)', () => {
    const { rerender, container } = render(<AIBrief />);
    const firstContent = container.textContent;
    rerender(<AIBrief />);
    expect(container.textContent).toBe(firstContent);
  });

  it('renders regenerate button', () => {
    render(<AIBrief />);
    expect(screen.getByRole('button', { name: /Regenerate Brief/ })).toBeInTheDocument();
  });
});

// ── Ticker ──

describe('Ticker', () => {
  it('renders with mock items and MOCK label', () => {
    render(<Ticker />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
    // Ticker duplicates items for seamless loop
    const reuters = screen.getAllByText('REUTERS');
    expect(reuters.length).toBeGreaterThanOrEqual(2);
  });

  it('shows ERR label on error with no data', () => {
    mockUseApiData.mockReturnValue({
      data: null,
      loading: false,
      error: new Error('ticker fail'),
      lastUpdate: null,
      refetch: mockRefetch,
    });
    render(<Ticker />);
    expect(screen.getByText('ERR')).toBeInTheDocument();
  });
});

// ── AlertBanner ──

describe('AlertBanner', () => {
  it('renders flash/urgent banners', () => {
    const alerts = [
      { id: 'a1', priority: 'flash' as const, source: 'gdelt' as const, title: 'Flash alert test', timestamp: new Date().toISOString(), read: false },
      { id: 'a2', priority: 'urgent' as const, source: 'acled' as const, title: 'Urgent alert test', timestamp: new Date().toISOString(), read: false },
    ];
    render(<AlertBanner alerts={alerts} dismissedIds={new Set()} onDismiss={() => {}} />);
    expect(screen.getByText('Flash alert test')).toBeInTheDocument();
    expect(screen.getByText('Urgent alert test')).toBeInTheDocument();
  });

  it('does not render routine/priority banners', () => {
    const alerts = [
      { id: 'a3', priority: 'routine' as const, source: 'executive_orders' as const, title: 'Routine alert', timestamp: new Date().toISOString(), read: false },
    ];
    render(<AlertBanner alerts={alerts} dismissedIds={new Set()} onDismiss={() => {}} />);
    expect(screen.queryByText('Routine alert')).not.toBeInTheDocument();
  });

  it('hides dismissed alerts', () => {
    const alerts = [
      { id: 'a1', priority: 'flash' as const, source: 'gdelt' as const, title: 'Dismissed flash', timestamp: new Date().toISOString(), read: false },
    ];
    render(<AlertBanner alerts={alerts} dismissedIds={new Set(['a1'])} onDismiss={() => {}} />);
    expect(screen.queryByText('Dismissed flash')).not.toBeInTheDocument();
  });
});

// ── Tab Components ──

describe('NatoResponse', () => {
  it('renders header and NATO members', () => {
    render(<NatoResponse />);
    expect(screen.getByText(/NATO Response/)).toBeInTheDocument();
    expect(screen.getByText(/Poland/)).toBeInTheDocument();
  });
});

describe('ExecutiveOrdersList', () => {
  it('renders header and mock EOs', () => {
    render(<ExecutiveOrdersList />);
    expect(screen.getByText(/Executive Orders/)).toBeInTheDocument();
  });
});

describe('CongressTracker', () => {
  it('renders header', () => {
    render(<CongressTracker />);
    expect(screen.getByText(/Congress Tracker/)).toBeInTheDocument();
  });
});

// ── ErrorBoundary ──

describe('ErrorBoundary', () => {
  // Suppress React error boundary console errors in test output
  const originalConsoleError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  function ThrowError() {
    throw new Error('Test crash');
  }

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child crashes', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('ATLAS — RENDER ERROR')).toBeInTheDocument();
    expect(screen.getByText('Test crash')).toBeInTheDocument();
  });

  it('has a reload button in error state', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );
    expect(screen.getByText('ATLAS — RENDER ERROR')).toBeInTheDocument();
    const reloadBtn = screen.getByText('Reload Dashboard');
    expect(reloadBtn).toBeInTheDocument();
    expect(reloadBtn.tagName).toBe('BUTTON');
  });
});

// ── IntelMonitor ──

describe('IntelMonitor', () => {
  it('renders header with unified view (no sub-tabs)', () => {
    render(<IntelMonitor />);
    expect(screen.getByText(/Intel Monitor/)).toBeInTheDocument();
    // Should NOT have the old 4 sub-tabs
    expect(screen.queryByText('diplomatic')).not.toBeInTheDocument();
    expect(screen.queryByText('propaganda')).not.toBeInTheDocument();
    expect(screen.queryByText('hostility')).not.toBeInTheDocument();
  });

  it('renders diplomatic events from mock data', () => {
    render(<IntelMonitor />);
    // Should show DIPLO badges for calendar events
    const diploBadges = screen.getAllByText('DIPLO');
    expect(diploBadges.length).toBeGreaterThan(0);
  });
});

// ── GlobalNarratives ──

describe('GlobalNarratives', () => {
  it('renders header', () => {
    render(<GlobalNarratives />);
    expect(screen.getByText(/Global Narratives/)).toBeInTheDocument();
  });

  it('shows no-data messages when API returns null', () => {
    render(<GlobalNarratives />);
    expect(screen.getByText(/No propaganda data available/)).toBeInTheDocument();
    expect(screen.getByText(/No hostility data available/)).toBeInTheDocument();
  });

  it('shows section headers', () => {
    render(<GlobalNarratives />);
    expect(screen.getByText(/State Media Narratives/)).toBeInTheDocument();
    expect(screen.getByText(/Bilateral Tensions/)).toBeInTheDocument();
  });
});

// ── EventTimeline ──

describe('EventTimeline', () => {
  it('renders with empty alerts', () => {
    const { container } = render(<EventTimeline alerts={[]} />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('renders severity legend', () => {
    render(<EventTimeline alerts={[]} />);
    expect(screen.getByText('flash')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('priority')).toBeInTheDocument();
    expect(screen.getByText('routine')).toBeInTheDocument();
  });

  it('renders dots for alerts', () => {
    const alerts = [
      { id: 'tl1', priority: 'flash' as const, source: 'gdelt' as const, title: 'Timeline flash', timestamp: new Date().toISOString(), read: false },
    ];
    const { container } = render(<EventTimeline alerts={alerts} />);
    const circles = container.querySelectorAll('circle');
    expect(circles.length).toBeGreaterThanOrEqual(1);
  });
});

// ── StrategicDepsViz ──

describe('StrategicDepsViz', () => {
  it('renders no-data message when empty', () => {
    render(<StrategicDepsViz dependencies={[]} />);
    expect(screen.getByText(/No strategic dependency data/)).toBeInTheDocument();
  });

  it('renders dependency bars', () => {
    const deps = [
      { resource: 'Crude Oil', icon: '🛢️', topProducer: 'Saudi Arabia', topProducerShare: '12%', usImportDep: '8%', supplyRisk: 'high' as const, notes: 'Test note' },
    ];
    render(<StrategicDepsViz dependencies={deps} />);
    expect(screen.getByText('Crude Oil')).toBeInTheDocument();
    expect(screen.getByText('Saudi Arabia')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });
});

// ── InternetFreedomPanel ──

describe('InternetFreedomPanel', () => {
  it('renders header', () => {
    render(<InternetFreedomPanel />);
    expect(screen.getByText(/Internet Freedom/)).toBeInTheDocument();
  });
});

// ── EconomicCalendarTab ──

describe('EconomicCalendarTab', () => {
  it('renders with no data', () => {
    render(<EconomicCalendarTab data={null} loading={false} error={null} lastUpdate={null} />);
    // Should render without crashing
  });

  it('shows error when error prop is set', () => {
    render(<EconomicCalendarTab data={null} loading={false} error={new Error('fail')} lastUpdate={null} />);
    expect(screen.getByText(/Failed to load economic calendar/)).toBeInTheDocument();
  });

  it('renders events when data provided', () => {
    const events = [
      { date: 'Feb 12', time: '8:30am', currency: 'USD', impact: 'high' as const, event_name: 'CPI YoY', forecast: '2.9%', previous: '2.9%' },
    ];
    render(<EconomicCalendarTab data={events} loading={false} error={null} lastUpdate={new Date()} />);
    expect(screen.getByText('CPI YoY')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
  });
});

}); // end ATLAS Dashboard Tests
