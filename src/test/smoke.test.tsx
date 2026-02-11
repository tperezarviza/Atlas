import { vi, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ──

// Mock useAutoRefresh so components don't trigger async fetches (eliminates act() warnings)
const mockRefresh = vi.fn().mockResolvedValue(undefined);
vi.mock('../hooks/useAutoRefresh', () => ({
  useAutoRefresh: vi.fn(() => ({
    data: null,
    error: null,
    lastUpdate: new Date(),
    refresh: mockRefresh,
  })),
}));

// Mock react-leaflet since jsdom has no real map rendering
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map">{children}</div>,
  TileLayer: () => null,
  Marker: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Polyline: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ invalidateSize: vi.fn() }),
}));

// Mock leaflet
vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
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
  },
}));

import { useAutoRefresh } from '../hooks/useAutoRefresh';
import App from '../App';
import TopBar from '../components/TopBar';
import LeaderFeed from '../components/LeaderFeed';
import WorldMap from '../components/WorldMap';
import MapLegend from '../components/MapLegend';
import MarketsDashboard from '../components/MarketsDashboard';
import ConflictList from '../components/ConflictList';
import NewsWire from '../components/NewsWire';
import DiplomaticCalendar from '../components/DiplomaticCalendar';
import AIBrief from '../components/AIBrief';
import Ticker from '../components/Ticker';
import ErrorBoundary from '../components/ErrorBoundary';
import { mockConflicts } from '../data/mockConflicts';

const mockUseAutoRefresh = vi.mocked(useAutoRefresh);

describe('ATLAS Dashboard Tests', () => {

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAutoRefresh.mockReturnValue({
    data: null,
    error: null,
    lastUpdate: new Date(),
    refresh: mockRefresh,
  });
});

// ── App ──

describe('App', () => {
  it('renders full layout with grid structure', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('renders all major sections', () => {
    render(<App />);
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText('📡 Leader Feed')).toBeInTheDocument();
    expect(screen.getByText(/Markets & Indicators/)).toBeInTheDocument();
    expect(screen.getByText('📰 Breaking Wire')).toBeInTheDocument();
    expect(screen.getByText('📅 Diplomatic Calendar')).toBeInTheDocument();
    expect(screen.getByText(/AI Intelligence Brief/)).toBeInTheDocument();
  });
});

// ── TopBar ──

describe('TopBar', () => {
  it('renders logo and LIVE badge', () => {
    render(<TopBar />);
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('renders clocks', () => {
    render(<TopBar />);
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
    expect(screen.getByText(/BsAs/)).toBeInTheDocument();
  });

  it('renders KPI labels', () => {
    render(<TopBar />);
    expect(screen.getByText('Active Conflicts')).toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
    expect(screen.getByText('WTI Oil')).toBeInTheDocument();
  });

  it('shows dash values when no data', () => {
    render(<TopBar />);
    // With data=null, KPI values show '—'
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(4);
  });
});

// ── LeaderFeed ──

describe('LeaderFeed', () => {
  it('renders header and mock data fallback', () => {
    render(<LeaderFeed />);
    expect(screen.getByText('📡 Leader Feed')).toBeInTheDocument();
    expect(screen.getByText('@realDonaldTrump')).toBeInTheDocument();
    expect(screen.getByText('@elonmusk')).toBeInTheDocument();
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

  it('shows ERROR badge on fetch error with no data', () => {
    mockUseAutoRefresh.mockReturnValue({
      data: null,
      error: new Error('Network error'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
    });
    render(<LeaderFeed />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load feed/)).toBeInTheDocument();
  });
});

// ── WorldMap ──

describe('WorldMap', () => {
  it('renders map container', () => {
    render(<WorldMap selectedConflictId="c1" onSelectConflict={() => {}} conflicts={null} conflictsError={null} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('renders mock conflict tooltips when no data', () => {
    render(<WorldMap selectedConflictId={null} onSelectConflict={() => {}} conflicts={null} conflictsError={null} />);
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
  });

  it('renders passed conflicts', () => {
    render(
      <WorldMap
        selectedConflictId={null}
        onSelectConflict={() => {}}
        conflicts={mockConflicts}
        conflictsError={null}
      />
    );
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
    expect(screen.getByText('Sudan Civil War')).toBeInTheDocument();
  });

  it('shows FEED ERROR when there are errors', () => {
    render(
      <WorldMap
        selectedConflictId={null}
        onSelectConflict={() => {}}
        conflicts={null}
        conflictsError={new Error('fail')}
      />
    );
    expect(screen.getByText('FEED ERROR')).toBeInTheDocument();
  });
});

// ── MapLegend ──

describe('MapLegend', () => {
  it('renders and shows layers', () => {
    render(<MapLegend />);
    expect(screen.getByText(/Map Layers/)).toBeInTheDocument();
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
  });

  it('toggles visibility on click', () => {
    render(<MapLegend />);
    const header = screen.getByText(/Map Layers/);
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.queryByText(/News: Crisis/)).not.toBeInTheDocument();
    fireEvent.click(header);
    expect(screen.getByText(/News: Crisis/)).toBeInTheDocument();
  });
});

// ── MarketsDashboard ──

describe('MarketsDashboard', () => {
  it('renders header and mock sections', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText(/Markets & Indicators/)).toBeInTheDocument();
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('WTI OIL')).toBeInTheDocument();
  });

  it('shows MOCK badge with no live data', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText('MOCK')).toBeInTheDocument();
  });

  it('shows ERROR badge on error', () => {
    mockUseAutoRefresh.mockReturnValue({
      data: null,
      error: new Error('API failed'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
    });
    render(<MarketsDashboard />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load markets/)).toBeInTheDocument();
  });
});

// ── ConflictList ──

describe('ConflictList', () => {
  it('renders mock conflicts when no data passed', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} conflicts={null} conflictsError={null} />);
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
    expect(screen.getByText('Sudan Civil War')).toBeInTheDocument();
  });

  it('shows Mock badge with no live data', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} conflicts={null} conflictsError={null} />);
    expect(screen.getByText('Mock')).toBeInTheDocument();
  });

  it('shows ACLED Live badge with live data', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} conflicts={mockConflicts} conflictsError={null} />);
    expect(screen.getByText('ACLED Live')).toBeInTheDocument();
  });

  it('shows ERROR badge on error with no data', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} conflicts={null} conflictsError={new Error('fail')} />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load conflicts/)).toBeInTheDocument();
  });

  it('shows STALE badge when data exists but refresh failed', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} conflicts={mockConflicts} conflictsError={new Error('stale')} />);
    expect(screen.getByText('STALE')).toBeInTheDocument();
  });

  it('calls onSelect when conflict is clicked', () => {
    const onSelect = vi.fn();
    render(<ConflictList selectedId="c1" onSelect={onSelect} conflicts={mockConflicts} conflictsError={null} />);
    fireEvent.click(screen.getByText('Sudan Civil War'));
    expect(onSelect).toHaveBeenCalledWith('c3');
  });
});

// ── NewsWire ──

describe('NewsWire', () => {
  it('renders header and mock items', () => {
    render(<NewsWire />);
    expect(screen.getByText('📰 Breaking Wire')).toBeInTheDocument();
    expect(screen.getByText(/Russia launches massive missile barrage/)).toBeInTheDocument();
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
    mockUseAutoRefresh.mockReturnValue({
      data: null,
      error: new Error('calendar fail'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
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

  it('shows error state when fetch fails', () => {
    mockUseAutoRefresh.mockReturnValue({
      data: null,
      error: new Error('brief fetch failed'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
    });
    render(<AIBrief />);
    expect(screen.getByText('ERROR')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load brief/)).toBeInTheDocument();
  });

  it('renders brief content when data available', () => {
    mockUseAutoRefresh.mockReturnValue({
      data: { html: '<p>Test brief content</p>', generatedAt: '2026-01-01T00:00', model: 'claude', sources: ['GDELT'] },
      error: null,
      lastUpdate: new Date(),
      refresh: mockRefresh,
    });
    render(<AIBrief />);
    expect(screen.getByText('Test brief content')).toBeInTheDocument();
    expect(screen.getByText('ATLAS AI')).toBeInTheDocument();
  });

  it('shows STALE badge when data exists but refresh failed', () => {
    mockUseAutoRefresh.mockReturnValue({
      data: { html: '<p>Old data</p>', generatedAt: '2026-01-01T00:00', model: 'claude', sources: [] },
      error: new Error('refresh failed'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
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
    mockUseAutoRefresh.mockReturnValue({
      data: null,
      error: new Error('ticker fail'),
      lastUpdate: new Date(),
      refresh: mockRefresh,
    });
    render(<Ticker />);
    expect(screen.getByText('ERR')).toBeInTheDocument();
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

}); // end ATLAS Dashboard Tests
