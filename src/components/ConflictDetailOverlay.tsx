import type { Conflict } from '../types';

interface ConflictDetailOverlayProps {
  conflict: Conflict | null;
  onClose: () => void;
}

const severityColor: Record<string, string> = {
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#d4a72c',
  low: '#ffc832',
};

const severityBg: Record<string, string> = {
  critical: 'rgba(255,59,59,.15)',
  high: 'rgba(255,140,0,.12)',
  medium: 'rgba(212,167,44,.1)',
  low: 'rgba(255,200,50,.1)',
};

export default function ConflictDetailOverlay({ conflict, onClose }: ConflictDetailOverlayProps) {
  if (!conflict) return null;

  return (
        <div
          className="absolute bottom-12 right-2 z-[800] overflow-hidden overlay-enter"
          style={{
            width: 280,
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,200,50,0.10)',
            borderRadius: '10px',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}
          >
            <span className="font-title text-[13px] font-semibold text-text-primary">
              {conflict.name}
            </span>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary text-[14px] leading-none cursor-pointer flex items-center justify-center transition-colors duration-150"
              style={{ width: 24, height: 24, borderRadius: 6 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,200,50,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="px-3 py-2">
            {/* Severity badge */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className="font-data text-[8px] font-bold tracking-[1px] px-[6px] py-[1px] rounded-[2px] uppercase"
                style={{
                  background: severityBg[conflict.severity],
                  color: severityColor[conflict.severity],
                  border: `1px solid ${severityColor[conflict.severity]}40`,
                }}
              >
                {conflict.severity}
              </span>
              <span className="font-data text-[9px] text-text-muted">
                {conflict.region}
              </span>
            </div>

            {/* Stats */}
            <div className="flex flex-col gap-[4px] font-data text-[10px]">
              <div className="flex justify-between">
                <span className="text-text-muted">Casualties</span>
                <span className="text-critical font-semibold">{conflict.casualties}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Displaced</span>
                <span className="text-high font-semibold">{conflict.displaced}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Trend</span>
                <span
                  className={
                    conflict.trend === 'escalating'
                      ? 'text-critical'
                      : conflict.trend === 'stable'
                      ? 'text-medium'
                      : 'text-positive'
                  }
                >
                  {conflict.trend === 'escalating'
                    ? '▲ Escalating'
                    : conflict.trend === 'stable'
                    ? '▬ Stable'
                    : '▼ De-escalating'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-muted">Since</span>
                <span className="text-text-secondary">{conflict.since}</span>
              </div>
            </div>
          </div>
        </div>
  );
}
