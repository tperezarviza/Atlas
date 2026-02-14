import { useRef, useEffect } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import type { UkraineFrontData } from '../../types';
import MaybeFadeIn from '../MaybeFadeIn';
import DataBadge from '../DataBadge';
import Skeleton from '../Skeleton';

const REFRESH_MS = 600_000; // 10 min

const INVASION_START = new Date('2022-02-24').getTime();

export default function UkraineWarMetrics() {
  const { data, loading, error, lastUpdate } = useApiData<UkraineFrontData>(api.ukraineFront, REFRESH_MS);
  const hasShownData = useRef(false);
  useEffect(() => { if (data) hasShownData.current = true; }, [data]);

  const dayCount = Math.floor((Date.now() - INVASION_START) / 86400000);
  const acledCount = data?.recent_events?.length ?? null;

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          ⚔️ Ukraine War Metrics
        </div>
        <DataBadge
          data={data}
          error={error}
          loading={loading}
          lastUpdate={lastUpdate}
          intervalMs={REFRESH_MS}
          liveLabel="ACLED"
          mockLabel="STATIC"
        />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load Ukraine front data. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <Skeleton lines={6} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {/* Day Counter */}
            <div
              className="px-4 py-4 text-center"
              style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}
            >
              <div className="font-data text-[36px] font-bold leading-none" style={{ color: '#ff3b3b' }}>
                {dayCount}
              </div>
              <div className="font-data text-[10px] tracking-[1px] text-text-muted uppercase mt-1">
                Day of Full-Scale Invasion
              </div>
            </div>

            {/* Recent ACLED Events */}
            <div className="flex items-center justify-between px-3 py-[8px]">
              <span className="font-data text-[10px] text-text-muted">📊 Recent ACLED Events</span>
              <span className="font-data text-[12px] font-semibold text-accent">
                {acledCount !== null ? `${acledCount} events` : '—'}
              </span>
            </div>
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
}
