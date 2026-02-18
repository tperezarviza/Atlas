import { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { NewsWireItem, TwitterIntelItem } from '../types';

// ── Constants ──

const TAB_LABELS = ['INTEL WIRE', 'RRSS', 'CII', 'FOCAL'] as const;
const ROTATION_SECONDS = 60;

const SPORTS_ENTERTAINMENT_RE =
  /\b(sport|football|soccer|basketball|nba|nfl|mlb|nhl|tennis|golf|cricket|f1|formula|baseball|boxing|ufc|mma|rugby|hockey|olympic|atletico|league|playoff|championship|tournament|coach|quarterback|pitcher|goalkeeper|roster|draft|halftime|overtime|touchdown|homerun|slam.dunk|entertainment|celebrity|movie|movies|film|music|album|grammy|oscar|emmy|fashion|kardashian|hollywood|netflix|disney|spotify|tiktok|broadway|reality.show|red.carpet|premiere|actor|actress|singer|rapper|pop.star|wellness|skincare|recipe|cookbook|dating|romance|wedding|divorce|baby|pregnant|puppy|kitten|pet|yoga|fitness|workout|marathon|triathlon|weight.loss|diet|vegan|restaurant|travel|vacation|tourism|hotel|resort|beach|cruise|roller.?coaster|theme.park|concert|festival|comic|anime|gaming|esports|streamer|influencer|viral|meme|selfie|outfit|makeup|hairstyle|tattoo|jewelry|perfume|fragrance|candle|decorat|gardening|crafts|diy|home.improvement|renovation|real.estate|mortgage|lottery|jackpot|slot|casino|betting|odds|handicap|parlay|fantasy.football|survivor|bachelor|idol|talent.show|decker|duvall|iconic.roles|remembering.*roles)\b/i;

const CONTEXT_FILTERS: Record<string, RegExp> = {
  mideast:  /israel|iran|gaza|hamas|hezbollah|houthi|yemen|saudi|syria|iraq|lebanon|turkey|egypt|jordan|qatar|uae/i,
  ukraine:  /ukraine|zelensky|putin|nato|pentagon|kharkiv|donetsk|crimea/i,
  domestic: /trump|congress|senate|border|white.?house|cabinet/i,
  intel:    /cyber|hack|apt|ransomware|malware|espionage|nsa|cia|mi6|mossad|fsb|gru/i,
};

const PLATFORM_COLORS: Record<string, string> = {
  twitter:  '#1d9bf0',
  x:        '#1d9bf0',
  telegram: '#00ff88',
  truth:    '#a855f7',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ff3b3b',
  high:     '#ff8c00',
  medium:   '#d4a72c',
  low:      '#50400e',
  accent:   '#d4a72c',
};

// ── CII types ──

interface CIIEntry {
  code: string;
  name: string;
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  sparkline: number[];
  factors: Record<string, number>;
}

// ── Focal Point types (matches server FocalPoint) ──

interface FocalPointSource {
  type: string;
  count: number;
  sample: string;
}

interface FocalPoint {
  entity: string;
  entityType: 'country' | 'organization' | 'person' | 'event';
  score: number;
  sources: FocalPointSource[];
  sourceTypeCount: number;
  trend: 'new' | 'rising' | 'stable' | 'falling';
  firstSeen: string;
  updatedAt: string;
}

// ── Helpers ──

function relativeTime(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function ciiScoreColor(s: number): string {
  if (s >= 80) return '#ff3b3b';
  if (s >= 60) return '#ff8c00';
  return '#ffc832';
}

function ciiLabel(s: number): string {
  if (s >= 80) return 'CRITICAL';
  if (s >= 60) return 'HIGH';
  if (s >= 40) return 'ELEVATED';
  return 'MODERATE';
}

// ── Sub-panels ──

const IntelWirePanel = memo(function IntelWirePanel({ contextId }: { contextId: string }) {
  const { data } = useApiData<NewsWireItem[]>(api.newswire, 900_000);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = useMemo(() => {
    if (!data) return [];
    let filtered = data.filter((item) => !SPORTS_ENTERTAINMENT_RE.test(item.headline));
    const ctxRe = CONTEXT_FILTERS[contextId];
    if (ctxRe) {
      filtered = filtered.filter((item) => ctxRe.test(item.headline));
    }
    return filtered.slice(0, 40);
  }, [data, contextId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;

    const onEnter = () => {
      isPausedRef.current = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
    const onLeave = () => {
      resumeTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 10_000);
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += 1;
      }
    }, 120);

    return () => {
      clearInterval(interval);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [items]);

  if (!data) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>Loading wire...</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>No matching items.</div>;
  }

  return (
    <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: '100%', overflowY: 'auto' }}>
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: 'flex',
            gap: 12,
            background: 'rgba(255,200,50,0.025)',
            borderRadius: 8,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {/* Severity bar */}
          <div
            style={{
              width: 4,
              flexShrink: 0,
              background: SEVERITY_COLORS[item.bullet] ?? '#50400e',
              borderRadius: '8px 0 0 8px',
            }}
          />
          <div style={{ padding: '10px 14px 10px 0', flex: 1, minWidth: 0 }}>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffffff',
                  lineHeight: 1.35,
                  marginBottom: 6,
                  textDecoration: 'none',
                  display: 'block',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffc832')}
                onMouseLeave={e => (e.currentTarget.style.color = '#ffffff')}
              >
                {item.headline}
              </a>
            ) : (
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: '#ffffff',
                  lineHeight: 1.35,
                  marginBottom: 6,
                }}
              >
                {item.headline}
              </div>
            )}
            <div
              style={{
                fontSize: 14,
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#c9a84c',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <span>{item.source}</span>
              <span style={{ color: '#7a6418' }}>{relativeTime(item.time)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

const TWEET_CATEGORY_COLORS: Record<string, string> = {
  crisis: '#ff3b3b',
  military: '#ff8c00',
  geopolitical: '#ffc832',
  trump: '#a855f7',
  osint: '#00ff88',
  border: '#d4a72c',
};

const RRSSPanel = memo(function RRSSPanel() {
  const { data } = useApiData<TwitterIntelItem[]>(api.twitterIntel, 120_000);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const items = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter(item =>
      !SPORTS_ENTERTAINMENT_RE.test(item.text) && !item.text.startsWith('RT @')
    );
    const seen = new Set<string>();
    return filtered.filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    }).slice(0, 80);
  }, [data]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;

    const onEnter = () => {
      isPausedRef.current = true;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
    const onLeave = () => {
      resumeTimerRef.current = setTimeout(() => {
        isPausedRef.current = false;
      }, 10_000);
    };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', onEnter, { passive: true });
    el.addEventListener('touchend', onLeave);

    const interval = setInterval(() => {
      if (isPausedRef.current) return;
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        el.scrollTop = 0;
      } else {
        el.scrollTop += 1;
      }
    }, 120);

    return () => {
      clearInterval(interval);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchstart', onEnter);
      el.removeEventListener('touchend', onLeave);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    };
  }, [items]);

  if (!data) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>Loading tweets...</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>No tweets.</div>;
  }

  return (
    <div ref={scrollRef} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '100%', overflowY: 'auto' }}>
      {items.map((item) => {
        const catColor = TWEET_CATEGORY_COLORS[item.category] ?? '#7a6418';
        const isUrgent = item.priority === 'flash' || item.priority === 'urgent';

        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              gap: 12,
              background: 'rgba(255,200,50,0.025)',
              borderRadius: 8,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {/* Category sidebar */}
            <div style={{ width: 4, flexShrink: 0, background: catColor, borderRadius: '8px 0 0 8px' }} />
            <div style={{ padding: '10px 14px 10px 0', flex: 1, minWidth: 0, display: 'flex', gap: 10 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: catColor, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: '#000',
                }}
              >
                {item.author.username[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", color: '#c9a84c' }}>
                    @{item.author.username}
                  </span>
                  {isUrgent && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, letterSpacing: 1,
                      padding: '1px 6px', borderRadius: 3,
                      background: item.priority === 'flash' ? '#ff3b3b' : '#ff8c00',
                      color: '#000', textTransform: 'uppercase',
                    }}>
                      {item.priority}
                    </span>
                  )}
                  <span style={{ fontSize: 13, color: '#7a6418', marginLeft: 'auto' }}>
                    {relativeTime(item.created_at)}
                  </span>
                </div>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 15, color: 'rgba(255,255,255,0.88)',
                    lineHeight: 1.45, textDecoration: 'none', display: 'block',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ffc832')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.88)')}
                >
                  {item.text}
                </a>
                <div style={{ display: 'flex', gap: 12, marginTop: 4, fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", color: '#7a6418' }}>
                  <span>RT {item.metrics.retweet_count}</span>
                  <span>{'\u2764'} {item.metrics.like_count}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

const CIIPanel = memo(function CIIPanel() {
  const { data } = useApiData<CIIEntry[]>(api.cii, 120_000);

  const top6 = useMemo(() => {
    if (!data) return [];
    return [...data].sort((a, b) => b.score - a.score).slice(0, 6);
  }, [data]);

  if (!data) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>Loading index...</div>;
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
      }}
    >
      {top6.map((entry) => (
        <div
          key={entry.code}
          style={{
            background: 'rgba(255,200,50,0.03)',
            border: '1px solid rgba(255,200,50,0.12)',
            borderRadius: 8,
            padding: 14,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: '#ffffff', marginBottom: 6 }}>
            {entry.name}
          </div>
          <div
            style={{
              fontSize: 32,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              color: ciiScoreColor(entry.score),
              lineHeight: 1.1,
            }}
          >
            {Math.round(entry.score)}
          </div>
          <div style={{ fontSize: 12, color: '#7a6418', marginTop: 4, letterSpacing: 1 }}>
            {ciiLabel(entry.score)}
          </div>
        </div>
      ))}
    </div>
  );
});

const FocalPanel = memo(function FocalPanel() {
  const { data } = useApiData<FocalPoint[]>(api.focalPoints, 900_000);

  const items = useMemo(() => (data ?? []).slice(0, 3), [data]);

  if (!data) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>Loading focal points...</div>;
  }
  if (items.length === 0) {
    return <div style={{ padding: '14px 20px', color: '#7a6418', fontSize: 14 }}>No focal points.</div>;
  }

  const TREND_ICONS: Record<string, { icon: string; color: string }> = {
    new:     { icon: '★', color: '#a855f7' },
    rising:  { icon: '▲', color: '#ff3b3b' },
    stable:  { icon: '▬', color: '#c9a84c' },
    falling: { icon: '▼', color: '#7a6418' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((fp) => {
        const borderColor = fp.score >= 50 ? '#ff3b3b' : fp.score >= 25 ? '#ff8c00' : '#ffc832';
        const trendInfo = TREND_ICONS[fp.trend] ?? TREND_ICONS.stable;
        const rawSample = fp.sources[0]?.sample ?? '';
        const topSample = rawSample.length > 120 ? rawSample.substring(0, 120) + '…' : rawSample;
        return (
          <div
            key={fp.entity}
            style={{
              background: 'rgba(255,200,50,0.03)',
              border: '1px solid rgba(255,200,50,0.12)',
              borderRadius: 8,
              padding: 14,
              borderLeft: `3px solid ${borderColor}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>
                {fp.entity}
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: 1,
                padding: '2px 6px', borderRadius: 4,
                background: 'rgba(255,200,50,0.08)',
                color: '#c9a84c', textTransform: 'uppercase',
              }}>
                {fp.entityType}
              </span>
              <span style={{ fontSize: 14, color: trendInfo.color, marginLeft: 'auto' }}>
                {trendInfo.icon} {fp.trend.toUpperCase()}
              </span>
            </div>
            {topSample && (
              <div
                style={{
                  fontSize: 16,
                  color: 'rgba(255,255,255,0.85)',
                  lineHeight: 1.45,
                  marginBottom: 8,
                }}
              >
                {topSample}
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                fontFamily: "'IBM Plex Mono', monospace",
                color: '#c9a84c',
                display: 'flex',
                gap: 8,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <span>Score {fp.score}</span>
              <span style={{ color: '#7a6418' }}>·</span>
              {fp.sources.map(s => (
                <span key={s.type} style={{ color: '#7a6418' }}>
                  {s.type.toUpperCase()} ×{s.count}
                </span>
              ))}
              <span style={{ color: '#7a6418' }}>· Updated {relativeTime(fp.updatedAt)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ── Main Component ──

interface RotatingPanelsProps {
  contextId: string;
}

export default memo(function RotatingPanels({ contextId }: RotatingPanelsProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Auto-rotation timer
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= ROTATION_SECONDS) {
          setActiveTab((tab) => (tab + 1) % TAB_LABELS.length);
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const handleTabClick = useCallback((index: number) => {
    setActiveTab(index);
    setElapsed(0);
  }, []);

  const progress = (elapsed / ROTATION_SECONDS) * 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar */}
      <div
        style={{
          height: 44,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid rgba(255,200,50,0.12)',
          background: 'rgba(255,200,50,0.03)',
          position: 'relative',
        }}
      >
        {TAB_LABELS.map((label, i) => {
          const isActive = i === activeTab;
          return (
            <button
              key={label}
              onClick={() => handleTabClick(i)}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? '2px solid #ffc832' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                color: isActive ? '#ffffff' : '#7a6418',
                padding: '0 8px',
                transition: 'color 200ms, border-color 200ms',
              }}
            >
              {label}
            </button>
          );
        })}

        {/* Progress bar */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 2,
            width: `${progress}%`,
            background: '#ffc832',
            opacity: 0.4,
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Panel content */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '14px 20px',
          minHeight: 0,
        }}
        className="scrollbar-thin"
      >
        {activeTab === 0 && <IntelWirePanel contextId={contextId} />}
        {activeTab === 1 && <RRSSPanel />}
        {activeTab === 2 && <CIIPanel />}
        {activeTab === 3 && <FocalPanel />}
      </div>
    </div>
  );
});
