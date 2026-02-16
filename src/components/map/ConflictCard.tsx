import { useState, useEffect } from 'react';
import type { Conflict } from '../../types';

interface ConflictCardProps {
  conflicts: Conflict[];
}

const ROTATE_INTERVAL = 30_000; // 30 seconds

function daysSince(dateStr: string): number {
  const start = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export default function ConflictCard({ conflicts }: ConflictCardProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // Sort by severity: critical > high > medium > low
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...conflicts].sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  const top = sorted.slice(0, 5);

  useEffect(() => {
    if (top.length <= 1) return;
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % top.length);
        setVisible(true);
      }, 300);
    }, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [top.length]);

  if (top.length === 0) return null;

  const conflict = top[index % top.length];
  if (!conflict) return null;

  const borderColor = conflict.severity === 'critical' ? '#ff3b3b'
    : conflict.severity === 'high' ? '#ff8c00'
    : '#d4a72c';

  const days = conflict.since ? daysSince(conflict.since) : 0;
  const trendIcon = conflict.trend === 'escalating' ? '▲' : conflict.trend === 'de-escalating' ? '▼' : '—';
  const trendColor = conflict.trend === 'escalating' ? '#ff8c00' : conflict.trend === 'de-escalating' ? '#00ff88' : '#7a6418';

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: 20,
      zIndex: 5,
      width: 340,
      background: 'rgba(6,8,12,0.92)',
      border: '1px solid rgba(255,200,50,0.22)',
      borderRadius: 10,
      padding: 16,
      borderLeft: `3px solid ${borderColor}`,
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 18,
        fontWeight: 700,
        color: '#ffffff',
        marginBottom: 6,
      }}>
        {conflict.name}
      </div>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        color: '#c9a84c',
        marginBottom: 10,
      }}>
        ACTIVE CONFLICT · DAY {days} · {conflict.severity.toUpperCase()}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>
          <span style={{ color: borderColor, fontWeight: 600 }}>{conflict.casualties || '—'}</span>
          <span style={{ color: '#7a6418', fontSize: 11, marginLeft: 4 }}>casualties</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>
          <span style={{ color: '#ffffff', fontWeight: 600 }}>{conflict.region}</span>
          <span style={{ color: '#7a6418', fontSize: 11, marginLeft: 4 }}>region</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 14 }}>
          <span style={{ color: trendColor, fontWeight: 600 }}>{trendIcon}</span>
          <span style={{ color: '#7a6418', fontSize: 11, marginLeft: 4 }}>trend</span>
        </div>
      </div>
    </div>
  );
}
