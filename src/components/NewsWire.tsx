import { memo, useRef, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { bulletColors } from '../utils/colors';
import { toneToColor } from '../utils/formatters';
import MaybeFadeIn from './MaybeFadeIn';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { NewsWireItem } from '../types';

const REFRESH_MS = 900_000; // 15 min

interface NewsWireProps {
  filter?: (item: NewsWireItem) => boolean;
  title?: string;
}

export default memo(function NewsWire({ filter, title }: NewsWireProps = {}) {
  const { data, loading, error, lastUpdate } = useApiData<NewsWireItem[]>(api.newswire, REFRESH_MS);
  const allItems = data ?? [];
  const wire = filter ? allItems.filter(filter) : allItems;
  const hasShownData = useRef(false);
  useEffect(() => { if (data) hasShownData.current = true; }, [data]);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' }}
      >
        <div className="font-title text-[14px] font-semibold tracking-[2px] uppercase text-text-secondary">
          {title ? `📰 ${title}` : '📰 Breaking Wire'}
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} liveLabel="GDELT Live" mockLabel="Mock" />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[13px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load wire. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <Skeleton lines={6} />
      ) : (
        /* Items */
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {wire.length === 0 && data ? (
              <div className="flex items-center justify-center h-full py-8">
                <span className="font-data text-[13px] text-text-muted tracking-[0.5px]">No matching items</span>
              </div>
            ) : wire.map((item) => {
              const tColor = toneToColor(item.tone);
              const toneWidth = Math.min(Math.abs(item.tone) * 8, 100);
              return (
                <div
                  key={item.id}
                  className="cursor-pointer transition-colors duration-150 hover:bg-bg-card-hover"
                  style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', padding: '8px 18px' }}
                >
                  <div className="flex items-center gap-[10px] mb-[3px]">
                    <div
                      className="w-[5px] h-[5px] rounded-full shrink-0"
                      style={{ background: bulletColors[item.bullet], marginTop: 1 }}
                    />
                    <span className="font-data text-[12px] text-text-muted">{item.source}</span>
                    <span className="font-data text-[12px] text-text-muted ml-auto">{item.time}</span>
                  </div>
                  <div className="text-[14px] leading-[1.4] text-text-primary">{item.headline}</div>
                  <div className="font-data text-[12px] mt-[3px] flex items-center gap-1">
                    <span
                      className="inline-block h-[3px] rounded-[1px]"
                      style={{ width: toneWidth, background: tColor }}
                    />
                    <span style={{ color: tColor }}>
                      {item.tone > 0 ? '+' : ''}{item.tone}
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
});
