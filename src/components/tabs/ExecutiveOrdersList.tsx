import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import type { ExecutiveOrder } from '../../types';
import DataBadge from '../DataBadge';

const REFRESH_MS = 300_000; // 5 min

const TOPIC_COLORS: Record<string, { bg: string; text: string }> = {
  Immigration:  { bg: 'rgba(255,59,59,.15)',  text: '#ff3b3b' },
  Trade:        { bg: 'rgba(255,140,0,.15)', text: '#ff8c00' },
  Defense:      { bg: 'rgba(255,200,50,.15)', text: '#ffc832' },
  Military:     { bg: 'rgba(255,200,50,.15)', text: '#ffc832' },
  Energy:       { bg: 'rgba(0,255,136,.15)',  text: '#00ff88' },
  Technology:   { bg: 'rgba(168,85,247,.15)', text: '#a855f7' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:     { bg: 'rgba(0,255,136,.15)',  text: '#00ff88' },
  challenged: { bg: 'rgba(212,167,44,.15)', text: '#d4a72c' },
  revoked:    { bg: 'rgba(255,59,59,.15)',  text: '#ff3b3b' },
};

function getTopicStyle(topic: string): { bg: string; text: string } {
  return TOPIC_COLORS[topic] ?? { bg: 'rgba(255,200,50,.15)', text: '#7a6418' };
}

export default function ExecutiveOrdersList() {
  const { data, loading, error, lastUpdate } = useApiData<ExecutiveOrder[]>(api.executiveOrders, REFRESH_MS);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const orders = data ?? [];

  const toggleExpand = (num: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(num)) next.delete(num);
      else next.add(num);
      return next;
    });
  };

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📜 Executive Orders
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load executive orders. Retrying...
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {orders.map(eo => {
          const topicLabel = eo.topics?.[0] ?? 'Other';
          const topicStyle = getTopicStyle(topicLabel);
          const statusStyle = STATUS_COLORS[eo.status] ?? STATUS_COLORS.active;
          const isExpanded = expandedIds.has(eo.number);

          return (
            <div
              key={eo.number}
              style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}
            >
              <div
                className="flex items-start px-[10px] py-[6px] cursor-pointer select-none hover:bg-bg-card-hover transition-colors gap-2"
                onClick={() => toggleExpand(eo.number)}
              >
                {/* Left column: number + title */}
                <div className="flex-1 min-w-0">
                  <div className="font-data text-[8px] text-text-muted mb-[1px]">
                    EO {eo.number}
                  </div>
                  <div className="font-data text-[11px] text-text-primary leading-tight">
                    {eo.title}
                  </div>
                  {/* Badges row */}
                  <div className="flex items-center gap-[4px] mt-[3px]">
                    <span
                      className="font-data text-[7px] px-[4px] py-[1px] rounded-[2px] uppercase"
                      style={{ background: topicStyle.bg, color: topicStyle.text }}
                    >
                      {topicLabel}
                    </span>
                    <span
                      className="font-data text-[7px] px-[4px] py-[1px] rounded-[2px] uppercase"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {eo.status}
                    </span>
                  </div>
                </div>

                {/* Right column: date */}
                <span className="font-data text-[9px] text-text-muted shrink-0 pt-[2px]">
                  {eo.signing_date}
                </span>
              </div>

              {/* Expanded summary */}
              {isExpanded && eo.summary && (
                <div
                  className="px-[10px] pb-[8px] pt-[2px]"
                  style={{ background: 'rgba(255,200,50,0.025)' }}
                >
                  <p className="font-data text-[10px] text-text-muted leading-[1.5]">
                    {eo.summary}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
