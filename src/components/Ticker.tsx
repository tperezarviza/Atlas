import React from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { TickerItem, EconomicEvent } from '../types';
import type { MarketsResponse } from '../services/api';

const MARKETS_REFRESH = 60_000;
const POLY_REFRESH = 300_000;
const CALENDAR_REFRESH = 900_000;
const TICKER_REFRESH = 300_000;

const itemStyle: React.CSSProperties = {
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 16,
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  flexShrink: 0,
};

const WANTED_MARKETS = ['S&P', 'NASDAQ', 'DOW', 'BTC', 'ETH', 'GOLD', 'OIL', 'EUR/USD'];

export default function Ticker() {
  const { data: marketsData } = useApiData<MarketsResponse>(api.markets, MARKETS_REFRESH);
  const { data: polyData } = useApiData<Record<string, unknown>[]>(api.polymarket, POLY_REFRESH);
  const { data: calendarData } = useApiData<EconomicEvent[]>(api.economicCalendar, CALENDAR_REFRESH);
  const { data: tickerData } = useApiData<TickerItem[]>(api.ticker, TICKER_REFRESH);

  // Build market items
  const marketItems: { name: string; price: string; delta: string; direction: string }[] = [];
  if (marketsData) {
    const allItems = [
      ...(marketsData.sections?.flatMap(s => s.items) ?? []),
      ...(marketsData.forex?.flatMap(s => s.items) ?? []),
    ];
    for (const w of WANTED_MARKETS) {
      const found = allItems.find(item => item.name.toUpperCase().includes(w.toUpperCase()));
      if (found) {
        marketItems.push({
          name: found.name,
          price: found.price,
          delta: found.delta,
          direction: found.direction,
        });
      }
    }
  }

  // Build polymarket items (top 5)
  const polyItems = (polyData ?? []).slice(0, 5).map((p) => {
    const title = (p.question ?? p.title ?? p.name ?? '—') as string;
    const prices = p.outcomePrices as number[] | undefined;
    const yesPrice = prices?.[0];
    let prob = '—';
    if (yesPrice != null) {
      prob = `${Math.round(Number(yesPrice) * 100)}%`;
    } else if (p.probability != null) {
      prob = `${Math.round(Number(p.probability))}%`;
    }
    return `${title}: ${prob}`;
  });

  // Build calendar items (high impact, next 24h, max 3)
  const now = Date.now();
  const calendarItems = (calendarData ?? [])
    .filter((e: EconomicEvent) => {
      if (e.impact !== 'high') return false;
      const eventTime = new Date(`${e.date}T${e.time || '00:00'}`).getTime();
      return eventTime > now && eventTime < now + 86_400_000;
    })
    .slice(0, 3)
    .map((e: EconomicEvent) => `${e.currency} ${e.event_name} ${e.time} ET`);

  // Tier 2 news (up to 5)
  const tier2Items = (tickerData ?? []).slice(0, 5);

  const renderItems = (keyPrefix: string): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];

    // Markets
    marketItems.forEach((m, i) => {
      elements.push(
        <span key={`${keyPrefix}-m-${i}`} style={itemStyle}>
          <span style={{ color: '#c9a84c' }}>{m.name}</span>
          <span style={{ color: '#ffffff' }}>{m.price}</span>
          <span
            style={{
              color:
                m.direction === 'up'
                  ? '#00ff88'
                  : m.direction === 'down'
                    ? '#ff3b3b'
                    : '#c9a84c',
            }}
          >
            {m.delta}
          </span>
        </span>,
      );
    });

    // Separator: Markets | Polymarket
    if (marketItems.length > 0 && polyItems.length > 0) {
      elements.push(
        <span key={`${keyPrefix}-sep1`} style={{ color: '#50400e', margin: '0 4px', flexShrink: 0 }}>
          •
        </span>,
      );
    }

    // Polymarket
    polyItems.forEach((p, i) => {
      elements.push(
        <span key={`${keyPrefix}-p-${i}`} style={{ ...itemStyle, color: '#a855f7' }}>
          {'\uD83D\uDCCA'} {p}
        </span>,
      );
    });

    // Separator: Polymarket | Calendar
    if (polyItems.length > 0 && calendarItems.length > 0) {
      elements.push(
        <span key={`${keyPrefix}-sep2`} style={{ color: '#50400e', margin: '0 4px', flexShrink: 0 }}>
          •
        </span>,
      );
    }

    // Economic Calendar
    calendarItems.forEach((c, i) => {
      elements.push(
        <span key={`${keyPrefix}-c-${i}`} style={{ ...itemStyle, color: '#ff8c00' }}>
          {'\uD83D\uDCC5'} {c}
        </span>,
      );
    });

    // Separator: Calendar | Tier 2
    if ((calendarItems.length > 0 || polyItems.length > 0 || marketItems.length > 0) && tier2Items.length > 0) {
      elements.push(
        <span key={`${keyPrefix}-sep3`} style={{ color: '#50400e', margin: '0 4px', flexShrink: 0 }}>
          •
        </span>,
      );
    }

    // Tier 2 News
    tier2Items.forEach((t, i) => {
      elements.push(
        <span key={`${keyPrefix}-t-${i}`} style={itemStyle}>
          <span style={{ color: '#7a6418' }}>T2</span>
          <span style={{ color: '#ffffff' }}>{t.text}</span>
        </span>,
      );
    });

    return elements;
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        borderTop: '1px solid rgba(255,200,50,0.12)',
        background: 'linear-gradient(180deg, rgba(255,200,50,0.02) 0%, transparent 100%)',
        height: '100%',
      }}
    >
      <div
        key="ticker-track"
        style={{
          display: 'flex',
          gap: 40,
          whiteSpace: 'nowrap',
          animation: 'scroll-ticker 120s linear infinite',
          paddingLeft: '100%',
        }}
      >
        {renderItems('a')}
        {renderItems('b')}
      </div>
    </div>
  );
}
