import { useMemo, memo } from 'react';
import { useAudioState } from './AudioToggle';
import { useClock } from '../hooks/useClock';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { TopBarData, HealthResponse } from '../services/api';
import type { ContextId } from '../hooks/useContextRotation';

const REFRESH_MS = 30_000;
const HEALTH_REFRESH_MS = 30_000;
const CLOCK_FILTER = new Set(['UTC', 'DC', 'MSK', 'BEI', 'TEH']);

interface TopBarProps {
  contextId: ContextId;
  contextIndex: number;
  progress: number;
  onContextClick: (idx: number) => void;
}

export default memo(function TopBar({ contextId }: TopBarProps) {
  const clock = useClock();
  const fetchTopbar = useMemo(() => () => api.topbar(contextId), [contextId]);
  const { data, error } = useApiData<TopBarData>(fetchTopbar, REFRESH_MS);
  const { data: healthData } = useApiData<HealthResponse>(api.health, HEALTH_REFRESH_MS);
  const [audioEnabled, toggleAudio] = useAudioState();

  const kpis = data?.kpis ?? [];
  const threatLevel = data?.threatLevel ?? 'ELEVATED';
  const healthSummary = healthData?.summary;
  const allOk = healthSummary ? healthSummary.ok === healthSummary.total : true;
  const healthColor = !healthData ? '#7a6418' : allOk ? '#00ff88' : '#ff8c00';
  const filteredZones = clock.zones.filter(z => CLOCK_FILTER.has(z.label));

  const threatColors: Record<string, string> = {
    CRITICAL: '#ff3b3b',
    ELEVATED: '#ff8c00',
    GUARDED: '#d4a72c',
    LOW: '#00ff88',
  };
  const badgeColor = threatColors[threatLevel] ?? '#ff8c00';

  // Map KPI colorClass to actual hex colors
  const kpiColor = (colorClass?: string): string => {
    if (!colorClass) return '#ffffff';
    if (colorClass.includes('critical')) return '#ff3b3b';
    if (colorClass.includes('high')) return '#ff8c00';
    if (colorClass.includes('positive')) return '#00ff88';
    if (colorClass.includes('accent')) return '#ffc832';
    if (colorClass.includes('muted')) return '#7a6418';
    return '#ffffff';
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: '100%',
      padding: '0 20px',
      background: 'linear-gradient(180deg, rgba(255,200,50,0.04), transparent)',
      borderBottom: '1px solid rgba(255,200,50,0.10)',
      position: 'relative',
      overflow: 'visible',
    }}>
      {/* Bottom accent line */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        background: 'linear-gradient(90deg, transparent, #ffc832, transparent)',
      }} />

      {/* ── GROUP 1: Logo + Threat Level ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, paddingRight: 18 }}>
        <div style={{
          fontFamily: "'Space Grotesk', sans-serif",
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: 6,
          color: '#ffc832',
          textShadow: '0 0 20px rgba(255,200,50,0.3)',
          lineHeight: 1,
        }}>
          ATLAS
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 10px',
          borderRadius: 3,
          background: `${badgeColor}15`,
          border: `1px solid ${badgeColor}40`,
        }}>
          <div style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: error && !data ? '#ff8c00' : badgeColor,
            animation: 'pulse-dot 1.5s infinite',
          }} />
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: badgeColor,
          }}>
            {error && !data ? 'OFFLINE' : threatLevel}
          </span>
        </div>
      </div>

      {/* DIVIDER */}
      <Divider />

      {/* ── GROUP 2: KPIs ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexShrink: 0, padding: '0 18px' }}>
        {kpis.length > 0
          ? kpis.map(kpi => (
              <div key={kpi.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 26,
                  fontWeight: 600,
                  color: kpiColor(kpi.colorClass),
                  lineHeight: 1.1,
                }}>
                  {kpi.value}
                </span>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: 1.5,
                  color: '#7a6418',
                  textTransform: 'uppercase' as const,
                }}>
                  {kpi.label}
                </span>
              </div>
            ))
          : <>
              <KPIPlaceholder label="CONFLICTS" />
              <KPIPlaceholder label="CRITICAL" />
              <KPIPlaceholder label="SOURCES" />
            </>
        }
      </div>

      {/* DIVIDER */}
      <Divider />

      {/* ── GROUP 3: Clocks ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: '0 16px',
      }}>
        {filteredZones.map((z) => (
          <div key={z.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 18,
              fontWeight: 500,
              color: '#ffffff',
              lineHeight: 1.2,
            }}>
              {z.time}
            </span>
            <span style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 1.5,
              color: '#7a6418',
              textTransform: 'uppercase' as const,
            }}>
              {z.label}
            </span>
          </div>
        ))}
      </div>

      {/* DIVIDER */}
      <Divider />

      {/* ── GROUP 4: Health + Audio toggle ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0, paddingLeft: 18 }}>
        {/* Health simple */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={healthColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          <span style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 16,
            fontWeight: 600,
            color: healthColor,
          }}>
            {healthSummary ? `${healthSummary.ok}/${healthSummary.total}` : '--/--'}
          </span>
        </div>

        {/* Audio toggle */}
        <button
          onClick={toggleAudio}
          title={audioEnabled ? 'Mute alerts' : 'Enable alert audio'}
          style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 4,
            border: '1px solid rgba(255,200,50,0.15)',
            background: audioEnabled ? 'rgba(255,200,50,0.10)' : 'transparent',
            cursor: 'pointer',
            transition: 'background 150ms, border-color 150ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,200,50,0.12)';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,200,50,0.25)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = audioEnabled ? 'rgba(255,200,50,0.10)' : 'transparent';
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,200,50,0.15)';
          }}
        >
          {audioEnabled ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffc832" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#50400e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
});

function Divider() {
  return (
    <div style={{
      width: 1,
      height: 28,
      background: 'rgba(255,200,50,0.12)',
      flexShrink: 0,
    }} />
  );
}

function KPIPlaceholder({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 26,
        fontWeight: 600,
        color: '#7a6418',
        lineHeight: 1.1,
      }}>
        --
      </span>
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: 1.5,
        color: '#7a6418',
        textTransform: 'uppercase' as const,
      }}>
        {label}
      </span>
    </div>
  );
}
