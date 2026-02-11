import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api } from '../services/api';
import { mockNewsWire } from '../data/mockNewsWire';
import { bulletColors } from '../utils/colors';
import { toneToColor } from '../utils/formatters';
import DataBadge from './DataBadge';
import type { NewsWireItem } from '../types';

export default function NewsWire() {
  const { data, error } = useAutoRefresh<NewsWireItem[]>(api.newswire, 60_000);
  const wire = data ?? mockNewsWire;

  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📰 Breaking Wire
        </div>
        <DataBadge data={data} error={error} liveLabel="GDELT Live" mockLabel="Mock" />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(232,59,59,.04)' }}>
          Failed to load wire: {error.message}
        </div>
      )}

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {wire.map((item) => {
          const tColor = toneToColor(item.tone);
          const toneWidth = Math.min(Math.abs(item.tone) * 8, 100);
          return (
            <div
              key={item.id}
              className="px-[10px] py-2 cursor-pointer transition-colors duration-150 hover:bg-bg-card-hover"
              style={{ borderBottom: '1px solid #14233f' }}
            >
              <div className="flex items-center gap-[6px] mb-[3px]">
                <div
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: bulletColors[item.bullet] }}
                />
                <span className="font-data text-[9px] text-text-muted">{item.source}</span>
                <span className="font-data text-[9px] text-text-muted ml-auto">{item.time}</span>
              </div>
              <div className="text-[12px] leading-[1.4] text-text-primary">{item.headline}</div>
              <div className="font-data text-[8px] mt-[3px] flex items-center gap-1">
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
      </div>
    </div>
  );
}
