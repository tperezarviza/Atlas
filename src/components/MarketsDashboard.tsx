import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api } from '../services/api';
import type { MarketsResponse } from '../services/api';
import { mockMarketSections, mockMacro, mockBorderStats, mockForexSections, mockCDS } from '../data/mockMarkets';
import type { MarketSection, MarketItem, CDSSpread, MarketSession } from '../types';
import DataBadge from './DataBadge';

function SparkBar({ item }: { item: MarketItem }) {
  return (
    <div className="flex-1 h-5 flex items-end gap-px px-[6px]">
      {item.sparkData.map((val, i) => (
        <div
          key={i}
          className="rounded-t-[1px] transition-[height] duration-300"
          style={{
            width: 3,
            height: `${val}%`,
            background: item.color || '#2d7aed',
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

function MarketRow({ item }: { item: MarketItem }) {
  return (
    <div className="flex items-center px-[10px] py-[3px] transition-colors duration-150 hover:bg-bg-card-hover">
      <span className="font-data text-[10px] text-text-secondary w-[80px] shrink-0">
        {item.name}
      </span>
      <SparkBar item={item} />
      <span className="font-data text-[11px] font-semibold text-text-primary w-[72px] text-right">
        {item.price}
      </span>
      <span
        className={`font-data text-[10px] w-[60px] text-right font-medium ${
          item.direction === 'up'
            ? 'text-positive'
            : item.direction === 'down'
            ? 'text-critical'
            : 'text-text-muted'
        }`}
      >
        {item.delta}
      </span>
    </div>
  );
}

function SectionBlock({ section }: { section: MarketSection }) {
  return (
    <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
      <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
        {section.icon} {section.title}
      </div>
      {section.items.map((item) => (
        <MarketRow key={item.name} item={item} />
      ))}
    </div>
  );
}

const SESSION_STYLES: Record<string, string> = {
  open: 'bg-positive/15 text-positive',
  pre_market: 'bg-accent/15 text-accent',
  after_hours: 'bg-warning/15 text-warning',
  closed: 'bg-text-muted/10 text-text-muted',
};

function SessionTracker({ sessions }: { sessions: MarketSession[] }) {
  return (
    <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
      <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
        🕐 Market Sessions
      </div>
      {sessions.map((s) => (
        <div key={s.region} className="flex justify-between items-center px-[10px] py-[3px]">
          <span className="font-data text-[10px] text-text-secondary">{s.label}</span>
          <div className="flex items-center gap-2">
            <span className={`font-data text-[8px] px-[4px] py-[1px] rounded-[2px] uppercase ${SESSION_STYLES[s.status] ?? SESSION_STYLES.closed}`}>
              {s.status.replace('_', ' ')}
            </span>
            <span className="font-data text-[9px] text-text-muted w-[80px] text-right">{s.nextEvent}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function cdsRiskColor(spread: number): string {
  if (spread === 0) return '#64748b';
  if (spread > 700) return '#e83b3b';
  if (spread > 300) return '#d4a72c';
  if (spread > 100) return '#2d7aed';
  return '#28b35a';
}

function CDSSpreads({ cds }: { cds: CDSSpread[] }) {
  // Filter out NR (not rated / sanctioned) with 0 spread
  const visible = cds.filter((c) => c.spread5Y > 0 || c.rating !== 'NR');
  return (
    <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
      <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
        📊 Sovereign CDS 5Y (bps)
      </div>
      {visible.map((c) => (
        <div key={c.code} className="flex justify-between items-center px-[10px] py-[2px]">
          <span className="font-data text-[10px] text-text-secondary w-[80px]">{c.country}</span>
          <span className="font-data text-[9px] text-text-muted w-[32px] text-center">{c.rating}</span>
          <span className="font-data text-[10px] font-semibold w-[48px] text-right" style={{ color: cdsRiskColor(c.spread5Y) }}>
            {c.spread5Y > 0 ? c.spread5Y : '—'}
          </span>
          <span
            className={`font-data text-[9px] w-[40px] text-right ${
              c.direction === 'up' ? 'text-critical' : c.direction === 'down' ? 'text-positive' : 'text-text-muted'
            }`}
          >
            {c.change > 0 ? `+${c.change}` : c.change === 0 ? '—' : c.change}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MarketsDashboard() {
  const { data, error } = useAutoRefresh<MarketsResponse>(api.markets, 60_000);

  const sections = data?.sections ?? mockMarketSections;
  const forex = data?.forex ?? mockForexSections;
  const sessions = data?.sessions;
  const cds = data?.cds ?? mockCDS;
  const macro = data?.macro ?? mockMacro;
  const border = data?.border ?? mockBorderStats;

  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          💹 Markets & Indicators
        </div>
        <DataBadge data={data} error={error} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(232,59,59,.04)' }}>
          Failed to load markets: {error.message}
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Session tracker */}
        {sessions && <SessionTracker sessions={sessions} />}

        {/* Market index sections (regional) + commodity sections */}
        {sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}

        {/* Forex sections */}
        {forex.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}

        {/* CDS Spreads */}
        <CDSSpreads cds={cds} />

        {/* US Macro */}
        <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
          <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
            🇺🇸 US Macro
          </div>
          {macro.map((item) => (
            <div key={item.label} className="flex justify-between px-[10px] py-[3px]">
              <span className="font-data text-[10px] text-text-muted">{item.label}</span>
              <span
                className="font-data text-[10px] font-medium"
                style={{ color: item.color || '#d8e2f0' }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Border Security */}
        <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
          <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
            🛃 Border Security (FY26)
          </div>
          {border.map((stat) => (
            <div key={stat.label} className="flex justify-between items-center px-[10px] py-1">
              <span className="font-data text-[10px] text-text-muted">{stat.label}</span>
              <span className="font-data text-[12px] font-semibold" style={{ color: stat.color || '#d8e2f0' }}>
                {stat.value}
                {stat.delta && (
                  <span className="font-data text-[9px] ml-1" style={{ color: stat.color || '#d8e2f0' }}>
                    {stat.delta}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
