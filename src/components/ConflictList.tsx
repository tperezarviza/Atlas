import { useRef, useEffect, useCallback } from 'react';
import MaybeFadeIn from './MaybeFadeIn';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { Conflict } from '../types';

interface ConflictListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
  conflicts: Conflict[] | null;
  conflictsLoading: boolean;
  conflictsError: Error | null;
  conflictsLastUpdate: Date | null;
}

const CONFLICTS_INTERVAL = 3_600_000; // match App.tsx

const severityBg: Record<string, string> = {
  critical: 'rgba(255,59,59,.15)',
  high: 'rgba(255,140,0,.12)',
  medium: 'rgba(212,167,44,.1)',
  low: 'rgba(255,200,50,.1)',
};

const severityColor: Record<string, string> = {
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#d4a72c',
  low: '#ffc832',
};

const severityBorder: Record<string, string> = {
  critical: 'rgba(255,59,59,.3)',
  high: 'rgba(255,140,0,.25)',
  medium: 'rgba(212,167,44,.2)',
  low: 'rgba(255,200,50,.2)',
};

export default function ConflictList({ selectedId, onSelect, conflicts, conflictsLoading, conflictsError, conflictsLastUpdate }: ConflictListProps) {
  const items = conflicts ?? [];
  const hasShownData = useRef(false);
  useEffect(() => { if (conflicts) hasShownData.current = true; }, [conflicts]);

  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const setItemRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) itemRefs.current.set(id, el);
    else itemRefs.current.delete(id);
  }, []);

  useEffect(() => {
    if (selectedId) {
      const el = itemRefs.current.get(selectedId);
      if (el && typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedId]);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          ⚔️ Active Conflicts
        </div>
        <DataBadge
          data={conflicts}
          error={conflictsError}
          loading={conflictsLoading}
          lastUpdate={conflictsLastUpdate}
          intervalMs={CONFLICTS_INTERVAL}
          liveLabel="ACLED Live"
          mockLabel="Mock"
        />
      </div>

      {/* Error message */}
      {conflictsError && !conflicts && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load conflicts: {conflictsError.message}
        </div>
      )}

      {/* Loading skeleton */}
      {conflictsLoading && !conflicts ? (
        <Skeleton lines={5} />
      ) : (
        /* List */
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {items.map((conflict) => {
              const isSelected = conflict.id === selectedId;
              return (
                <div
                  key={conflict.id}
                  ref={(el) => setItemRef(conflict.id, el)}
                  className="px-3 py-[10px] cursor-pointer transition-colors duration-150 hover:bg-bg-card-hover"
                  style={{
                    borderBottom: '1px solid rgba(255,200,50,0.10)',
                    background: isSelected ? 'rgba(255,200,50,.08)' : undefined,
                    borderLeft: isSelected ? '3px solid #ffc832' : '3px solid transparent',
                    boxShadow: isSelected ? '0 0 8px rgba(255,200,50,0.1)' : undefined,
                  }}
                  onClick={() => onSelect(conflict.id)}
                >
                  {/* Top row */}
                  <div className="flex items-center gap-[6px] mb-[3px]">
                    <span
                      className="font-data text-[8px] font-bold tracking-[1px] px-[6px] py-[1px] rounded-[2px] uppercase"
                      style={{
                        background: severityBg[conflict.severity],
                        color: severityColor[conflict.severity],
                        border: `1px solid ${severityBorder[conflict.severity]}`,
                      }}
                    >
                      {conflict.severity}
                    </span>
                    <span className="font-title text-[14px] font-semibold text-text-primary">
                      {conflict.name}
                    </span>
                  </div>

                  {/* Region */}
                  <div className="font-data text-[9px] text-text-muted tracking-[0.5px]">
                    🌍 {conflict.region} · Since {conflict.since}
                  </div>

                  {/* Stats */}
                  <div className="flex gap-[10px] mt-1 font-data text-[9px] text-text-secondary">
                    <span className="flex items-center gap-[3px]">☠️ {conflict.casualties}</span>
                    <span className="flex items-center gap-[3px]">🏃 {conflict.displaced}</span>
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
                </div>
              );
            })}
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
}
