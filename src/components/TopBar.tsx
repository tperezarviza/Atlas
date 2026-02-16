import { useState, useRef, useMemo, useEffect, memo } from 'react';
import { useClock } from '../hooks/useClock';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { TopBarData, HealthResponse } from '../services/api';
import type { ContextId } from '../hooks/useContextRotation';
import { CONTEXTS } from '../hooks/useContextRotation';
import ApiHealthPanel from './ApiHealthPanel';

const REFRESH_MS = 30_000;
const HEALTH_REFRESH_MS = 30_000;
const CLOCK_FILTER = new Set(['DC', 'UTC', 'LON', 'MSK', 'BEI', 'TEH']);

// Extracted inline style constants (avoid object recreation on every render)
const TOPBAR_STYLE = { background: '#000000', borderBottom: '1px solid rgba(255,200,50,0.10)', padding: '0 20px', gap: 0 };
const DIVIDER_STYLE = { width: 1, height: 22, background: 'rgba(255,200,50,0.10)' };
const ACCENT_LINE = { background: 'linear-gradient(90deg, transparent, #ffc832, transparent)' };
const MUTED_COLOR = { color: '#7a6418' };
const HEALTH_DROPDOWN = { width: 380, maxHeight: 480, background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,200,50,0.10)', boxShadow: '0 8px 32px rgba(0,0,0,.5)' };

interface TopBarProps {
  contextId: ContextId;
  contextIndex: number;
  progress: number;
  onContextClick: (idx: number) => void;
}

export default memo(function TopBar({ contextId, contextIndex, progress, onContextClick }: TopBarProps) {
  const clock = useClock();
  const fetchTopbar = useMemo(() => () => api.topbar(contextId), [contextId]);
  const { data, error } = useApiData<TopBarData>(fetchTopbar, REFRESH_MS);
  const [healthOpen, setHealthOpen] = useState(false);
  const healthContainerRef = useRef<HTMLDivElement>(null);

  const { data: healthData } = useApiData<HealthResponse>(api.health, HEALTH_REFRESH_MS);

  useEffect(() => {
    if (!healthOpen) return;
    const handler = (e: MouseEvent) => {
      const el = healthContainerRef.current;
      if (el && !el.contains(e.target as Node)) setHealthOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [healthOpen]);

  const kpis = data?.kpis ?? [];
  const healthSummary = healthData?.summary;
  const allOk = healthSummary ? healthSummary.ok === healthSummary.total : true;
  const healthColor = !healthData ? '#7a6418' : allOk ? '#00ff88' : '#ff8c00';
  const filteredZones = clock.zones.filter(z => CLOCK_FILTER.has(z.label));

  return (
    <div
      className="h-full flex items-center relative overflow-visible"
      style={TOPBAR_STYLE}
    >
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={ACCENT_LINE}
      />

      {/* ── GROUP 1: Logo + LIVE ── */}
      <div className="flex items-center gap-[12px] shrink-0" style={{ padding: '0 16px 0 0' }}>
        <div className="font-title font-bold tracking-[4px]" style={{ fontSize: '18px' }}>
          <span style={{ color: '#ffc832' }}>▣</span>{' '}
          <span style={{ color: '#ffe082' }}>ATLAS</span>
        </div>
        <div
          className="flex items-center gap-[5px] rounded-[3px] px-2 py-[2px] font-data text-[13px] font-semibold tracking-[1px]"
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
      <div className="shrink-0" style={DIVIDER_STYLE} />

      {/* ── GROUP 2: Context Rotation Bar ── */}
      <div className="flex items-center gap-[2px] shrink-0" style={{ padding: '0 16px' }}>
        {CONTEXTS.map((ctx, idx) => {
          const isActive = idx === contextIndex;
          return (
            <button
              key={ctx.id}
              onClick={() => onContextClick(idx)}
              className="font-title font-semibold tracking-[1px] cursor-pointer transition-all duration-200 relative"
              style={{
                fontSize: isActive ? '13px' : '11px',
                background: 'transparent',
                color: isActive ? '#ffc832' : '#50400e',
                padding: '6px 12px',
                borderRadius: 0,
                borderBottom: isActive ? '2px solid #ffc832' : '2px solid transparent',
              }}
            >
              {ctx.icon} {ctx.label}
              {/* Progress bar under active context */}
              {isActive && (
                <div
                  className="absolute bottom-0 left-0 h-[2px]"
                  style={{
                    width: `${progress}%`,
                    background: 'linear-gradient(90deg, #ffc832, #ffe082)',
                    transition: progress === 0 ? 'none' : 'width 180s linear',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={DIVIDER_STYLE} />

      {/* ── GROUP 3: Clocks ── */}
      <div className="flex-1 flex items-center justify-center gap-[16px]" style={{ padding: '0 12px' }}>
        {filteredZones.map((z) => (
          <div key={z.label} className="flex flex-col items-center">
            <span className="font-data text-[10px] tracking-[1px]" style={MUTED_COLOR}>{z.label}</span>
            <span className="font-data text-[14px] font-medium" style={{ color: '#ffc832' }}>{z.time}</span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={DIVIDER_STYLE} />

      {/* ── GROUP 4: Stats ── */}
      <div className="flex items-center gap-[14px] shrink-0" style={{ padding: '0 12px' }}>
        {kpis.length > 0
          ? kpis.map(kpi => (
              <KPI key={kpi.label} label={kpi.label} value={kpi.value} colorClass={kpi.colorClass} />
            ))
          : <>
              <KPI label="CONFLICTS" value="—" colorClass="text-text-muted" />
              <KPI label="CRITICAL" value="—" colorClass="text-text-muted" />
              <KPI label="BTC" value="—" colorClass="text-text-muted" />
            </>
        }
      </div>

      {/* DIVIDER */}
      <div className="shrink-0" style={DIVIDER_STYLE} />

      {/* ── GROUP 5: Health btn ── */}
      <div className="flex items-center gap-[12px] shrink-0" style={{ padding: '0 0 0 16px' }}>
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
              <span className="font-data text-[12px] font-bold" style={{ color: "#ff8c00" }}>
                {healthSummary.total - healthSummary.ok}
              </span>
            )}
          </div>

          {healthOpen && (
            <div
              className="fixed mt-1 z-[960] rounded-[3px] overflow-hidden"
              style={{ ...HEALTH_DROPDOWN, top: 48, right: 8 }}
            >
              <div style={{ maxHeight: "70vh" }}>
                <ApiHealthPanel />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const ALLOWED_COLOR_CLASSES = new Set([
  'text-critical', 'text-high', 'text-medium', 'text-positive',
  'text-accent', 'text-text-primary', 'text-text-muted', 'text-text-secondary',
]);

function KPI({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  const safeColor = colorClass && ALLOWED_COLOR_CLASSES.has(colorClass) ? colorClass : 'text-text-primary';
  return (
    <div className="flex flex-col items-center px-[2px] py-[2px]">
      <div className="text-[10px] uppercase tracking-[1px] font-data font-medium" style={MUTED_COLOR}>
        {label}
      </div>
      <div className={`font-data text-[14px] font-semibold ${safeColor}`}>
        {value}
      </div>
    </div>
  );
}
