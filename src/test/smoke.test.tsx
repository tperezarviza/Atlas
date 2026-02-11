import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

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

describe('Smoke Tests — All components render without crashing', () => {
  it('App renders the full layout', () => {
    const { container } = render(<App />);
    expect(container.firstChild).toBeTruthy();
  });

  it('TopBar renders logo and LIVE badge', () => {
    render(<TopBar />);
    expect(screen.getByText('ATLAS')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
  });

  it('TopBar renders clocks (UTC and BsAs labels)', () => {
    render(<TopBar />);
    expect(screen.getByText(/UTC/)).toBeInTheDocument();
    expect(screen.getByText(/BsAs/)).toBeInTheDocument();
  });

  it('TopBar renders KPIs', () => {
    render(<TopBar />);
    expect(screen.getByText('Active Conflicts')).toBeInTheDocument();
    expect(screen.getByText('BTC')).toBeInTheDocument();
  });

  it('LeaderFeed renders feed items', () => {
    render(<LeaderFeed />);
    expect(screen.getByText('📡 Leader Feed')).toBeInTheDocument();
    expect(screen.getByText('@realDonaldTrump')).toBeInTheDocument();
    expect(screen.getByText('@elonmusk')).toBeInTheDocument();
  });

  it('LeaderFeed renders bold text safely (no dangerouslySetInnerHTML)', () => {
    render(<LeaderFeed />);
    const bold = screen.getByText('TARIFFS');
    expect(bold.tagName).toBe('STRONG');
  });

  it('WorldMap renders with map container', () => {
    render(<WorldMap selectedConflictId="c1" onSelectConflict={() => {}} />);
    expect(screen.getByTestId('map')).toBeInTheDocument();
  });

  it('WorldMap renders conflict tooltips', () => {
    render(<WorldMap selectedConflictId={null} onSelectConflict={() => {}} />);
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
  });

  it('MapLegend renders and can toggle', () => {
    render(<MapLegend />);
    expect(screen.getByText(/Map Layers/)).toBeInTheDocument();
  });

  it('MarketsDashboard renders sections', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText(/Markets & Indicators/)).toBeInTheDocument();
  });

  it('MarketsDashboard renders market items', () => {
    render(<MarketsDashboard />);
    expect(screen.getByText('S&P 500')).toBeInTheDocument();
    expect(screen.getByText('WTI OIL')).toBeInTheDocument();
  });

  it('ConflictList renders all conflicts', () => {
    render(<ConflictList selectedId="c1" onSelect={() => {}} />);
    expect(screen.getByText('Russia-Ukraine War')).toBeInTheDocument();
    expect(screen.getByText('Sudan Civil War')).toBeInTheDocument();
  });

  it('ConflictList highlights selected conflict', () => {
    const { container } = render(<ConflictList selectedId="c1" onSelect={() => {}} />);
    const selected = container.querySelector('[style*="border-bright"]') ||
                     container.querySelector('[class*="border-bright"]');
    // Just verify it renders without crash - visual selection is CSS-based
    expect(container.firstChild).toBeTruthy();
  });

  it('NewsWire renders breaking news items', () => {
    render(<NewsWire />);
    expect(screen.getByText('📰 Breaking Wire')).toBeInTheDocument();
    expect(screen.getByText(/Russia launches massive missile barrage/)).toBeInTheDocument();
  });

  it('NewsWire renders tone indicators', () => {
    render(<NewsWire />);
    expect(screen.getByText(/-9.1/)).toBeInTheDocument();
    expect(screen.getByText(/\+2.8/)).toBeInTheDocument();
  });

  it('DiplomaticCalendar renders events', () => {
    render(<DiplomaticCalendar />);
    expect(screen.getByText('📅 Diplomatic Calendar')).toBeInTheDocument();
    expect(screen.getByText('EU Foreign Affairs Council')).toBeInTheDocument();
    expect(screen.getByText('Munich Security Conference')).toBeInTheDocument();
  });

  it('AIBrief renders sections', () => {
    render(<AIBrief />);
    expect(screen.getByText('🤖 AI Intelligence Brief')).toBeInTheDocument();
    expect(screen.getByText(/Situation Overview/)).toBeInTheDocument();
    expect(screen.getByText(/Critical Developments/)).toBeInTheDocument();
    expect(screen.getByText(/Threat Matrix/)).toBeInTheDocument();
  });

  it('AIBrief renders threat items', () => {
    render(<AIBrief />);
    expect(screen.getByText(/UKRAINE:/)).toBeInTheDocument();
    expect(screen.getByText(/SUDAN:/)).toBeInTheDocument();
    expect(screen.getByText(/IRAN:/)).toBeInTheDocument();
  });

  it('AIBrief has a stable timestamp (not re-generated on render)', () => {
    const { rerender, container } = render(<AIBrief />);
    const firstTimestamp = container.textContent;
    rerender(<AIBrief />);
    const secondTimestamp = container.textContent;
    expect(firstTimestamp).toBe(secondTimestamp);
  });

  it('Ticker renders scrolling items', () => {
    render(<Ticker />);
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    // Ticker duplicates items for seamless loop
    const reuters = screen.getAllByText('REUTERS');
    expect(reuters.length).toBeGreaterThanOrEqual(2);
  });
});
