import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { TickerItem } from '../types';

const REFRESH_MS = 300_000; // 5 min

export default function Ticker() {
  const { data, error } = useApiData<TickerItem[]>(api.ticker, REFRESH_MS);
  const items = data ?? [];

  const label = error && !data ? 'ERR' : data ? 'LIVE' : 'MOCK';
  const labelColor = error && !data ? '#ff3b3b' : data && error ? '#d4a72c' : data ? '#00ff88' : '#ff3b3b';

  return (
    <div
      className="h-full flex items-center overflow-hidden relative"
      style={{
        background: '#000000',
        borderTop: '1px solid rgba(255,200,50,0.10)',
        boxShadow: '0 -1px 8px rgba(255,200,50,0.05)',
        marginTop: 4,
      }}
    >
      {/* Status label */}
      <div
        className="font-data text-[8px] font-bold tracking-[1px] px-[10px] shrink-0"
        style={{ borderRight: '1px solid rgba(255,200,50,0.10)', color: labelColor }}
      >
        {label}
      </div>

      {/* Scrolling track */}
      <div
        className="flex whitespace-nowrap"
        style={{ animation: 'scroll-ticker 120s linear infinite' }}
      >
        {/* Duplicate items for seamless loop */}
        {[...items, ...items].map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex items-center gap-[6px] px-6 text-[11px] shrink-0">
            <div
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: item.bulletColor }}
            />
            <span className="font-data text-[9px] text-text-muted shrink-0">{item.source}</span>
            <span className="text-text-secondary">{item.text}</span>
            {i < items.length * 2 - 1 && (
              <span className="text-text-muted ml-4">│</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
