import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useClock } from '../hooks/useClock';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { TopBarData, HealthResponse } from '../services/api';
import type { ViewId } from '../types/views';
import { TAB_LABELS } from '../types/tabs';
import ApiHealthPanel from './ApiHealthPanel';

const REFRESH_MS = 30_000; // 30s
const HEALTH_REFRESH_MS = 30_000;

const CLOCK_FILTER = new Set(['BUE', 'DC']);

interface TopBarProps {
  activeView: ViewId;
  onViewChange: (view: ViewId) => void;
}

export default function TopBar({ activeView, onViewChange }: TopBarProps) {
  const clock = useClock();
  const fetchTopbar = useMemo(() => () => api.topbar(activeView), [activeView]);
  const { data, error } = useApiData<TopBarData>(fetchTopbar, REFRESH_MS);
  const [healthOpen, setHealthOpen] = useState(false);
  const healthContainerRef = useRef<HTMLDivElement>(null);

  const { data: healthData } = useApiData<HealthResponse>(api.health, HEALTH_REFRESH_MS);

  // Click-outside handler for health panel
  useEffect(() => {
    if (!healthOpen) return;
    const handler = (e: MouseEvent) => {
      const el = healthContainerRef.current;
      if (el && !el.contains(e.target as Node)) {
        setHealthOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [healthOpen]);

  const kpis = data?.kpis ?? [];

  // Derive health summary for the indicator dot
  const healthSummary = healthData?.summary;
  const allOk = healthSummary ? healthSummary.ok === healthSummary.total : true;
  const healthColor = !healthData ? '#7a6418' : allOk ? '#00ff88' : '#ff8c00';

  // Filter clocks to BUE + DC only
  const filteredZones = clock.zones.filter(z => CLOCK_FILTER.has(z.label));

  return (
    <div
      className="h-full flex items-center relative overflow-visible"
      style={{
        background: '#000000',
        borderBottom: '1px solid rgba(255,200,50,0.10)',
        padding: '0 20px',
        gap: 0,
      }}
    >
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #ffc832, transparent)' }}
      />

      {/* ── GROUP 1: Logo + LIVE ── */}
      <div className="flex items-center gap-[12px] shrink-0" style={{ padding: '0 16px 0 0' }}>
        <div className="font-title font-bold tracking-[4px]" style={{ fontSize: '17px' }}>
          <span style={{ color: '#ffc832' }}>▣</span>{' '}
          <span style={{ color: '#ffe082' }}>ATLAS</span>
        </div>
        <div
          className="flex items-center gap-[5px] rounded-[3px] px-2 py-[2px] font-data text-[10px] font-semibold tracking-[1px]"
          style={{
            background: error && !data ? 'rgba(255,140,0,.12)' : 'rgba(255,59,59,.12)',
            border: error && !data ? '1px solid rgba(255,140,0,.3)' : '1px solid rgba(255,59,59,.3)',
            color: error && !data ? '#ff8c00' : '#ff3b3b',
          }}
        >
          <div
            className="w-[6px] h-[6px] rounded-full"
            style={{
              background: error && !data ? '#ff8c00' : '#ff3b3b',
              animation: 'pulse-dot 1.5s infinite',
            }}
          />
          {error && !data ? 'OFFLINE' : 'LIVE'}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={{ width: 1, height: 22, background: 'rgba(255,200,50,0.10)' }} />

      {/* ── GROUP 2: Tabs ── */}
      <div className="flex items-center gap-[4px] shrink-0" style={{ padding: '0 16px' }}>
        {TAB_LABELS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onViewChange(tab.id)}
            className="font-title text-[9px] font-semibold tracking-[1px] cursor-pointer transition-colors duration-150"
            style={{
              background: activeView === tab.id ? '#ffc832' : 'transparent',
              color: activeView === tab.id ? '#000000' : '#7a6418',
              padding: '4px 11px',
              borderRadius: '16px',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={{ width: 1, height: 22, background: 'rgba(255,200,50,0.10)' }} />

      {/* ── GROUP 3: Clocks (centered in available space) ── */}
      <div className="flex-1 flex items-center justify-center gap-[28px]" style={{ padding: '0 16px' }}>
        {filteredZones.map((z) => (
          <div key={z.label} className="flex flex-col items-center">
            <span className="font-data text-[7px] tracking-[1px]" style={{ color: '#7a6418' }}>{z.label}</span>
            <span className="font-data text-[14px] font-medium" style={{ color: '#ffc832' }}>{z.time}</span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={{ width: 1, height: 22, background: 'rgba(255,200,50,0.10)' }} />

      {/* ── GROUP 4: Stats (Conflicts + Critical) ── */}
      <div className="flex items-center gap-[20px] shrink-0" style={{ padding: '0 16px' }}>
        {kpis.length > 0
          ? kpis.slice(0, 2).map(kpi => (
              <KPI key={kpi.label} label={kpi.label} value={kpi.value} colorClass={kpi.colorClass} />
            ))
          : <>
              <KPI label="ACTIVE CONFLICTS" value="—" colorClass="text-text-muted" />
              <KPI label="CRITICAL" value="—" colorClass="text-text-muted" />
            </>
        }
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={{ width: 1, height: 22, background: 'rgba(255,200,50,0.10)' }} />

      {/* ── GROUP 5: Threat + API Health btn ── */}
      <div className="flex items-center gap-[12px] shrink-0" style={{ padding: '0 0 0 16px' }}>
        {/* System Health Indicator (button only — no API bars) */}
        <div ref={healthContainerRef} className="relative">
          <div
            className="cursor-pointer flex items-center gap-[4px] px-[6px] py-[3px] rounded-[3px] transition-colors duration-150"
            style={{
              background: healthOpen ? "rgba(255,200,50,.12)" : "transparent",
              border: healthOpen ? "1px solid rgba(255,200,50,.25)" : "1px solid transparent",
            }}
            onClick={() => setHealthOpen(prev => !prev)}
            title="System Health"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={healthColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
            {healthSummary && !allOk && (
              <span
                className="font-data text-[8px] font-bold"
                style={{ color: "#ff8c00" }}
              >
                {healthSummary.total - healthSummary.ok}
              </span>
            )}
          </div>

          {/* Health Dropdown Panel */}
          {healthOpen && (
            <div
              className="absolute top-full right-0 mt-1 z-[960] rounded-[3px] overflow-hidden"
              style={{
                width: 380,
                maxHeight: 480,
                background: "#000000",
                border: "1px solid rgba(255,200,50,0.10)",
                boxShadow: "0 8px 32px rgba(0,0,0,.5)",
                backdropFilter: "blur(24px)",
              }}
            >
              <div style={{ height: 480, maxHeight: "70vh" }}>
                <ApiHealthPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ALLOWED_COLOR_CLASSES = new Set([
  'text-critical', 'text-high', 'text-medium', 'text-positive',
  'text-accent', 'text-text-primary', 'text-text-muted', 'text-text-secondary',
]);

function KPI({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  const safeColor = colorClass && ALLOWED_COLOR_CLASSES.has(colorClass) ? colorClass : 'text-text-primary';
  return (
    <div className="flex flex-col items-center px-[4px] py-[2px]">
      <div className="text-[8px] uppercase tracking-[1.5px] font-data font-medium" style={{ color: '#7a6418' }}>
        {label}
      </div>
      <div className={`font-data text-[15px] font-semibold ${safeColor}`}>
        {value}
      </div>
    </div>
  );
}
