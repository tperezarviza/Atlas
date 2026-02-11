import { mockTicker } from '../data/mockTicker';

export default function Ticker() {
  return (
    <div
      className="h-full flex items-center overflow-hidden relative"
      style={{
        background: '#070d1a',
        borderTop: '1px solid #14233f',
      }}
    >
      {/* LIVE label */}
      <div
        className="font-data text-[8px] font-bold tracking-[1px] text-critical px-[10px] shrink-0"
        style={{ borderRight: '1px solid #14233f' }}
      >
        LIVE
      </div>

      {/* Scrolling track */}
      <div
        className="flex whitespace-nowrap"
        style={{ animation: 'scroll-ticker 120s linear infinite' }}
      >
        {/* Duplicate items for seamless loop */}
        {[...mockTicker, ...mockTicker].map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex items-center gap-[6px] px-6 text-[11px] shrink-0">
            <div
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: item.bulletColor }}
            />
            <span className="font-data text-[9px] text-text-muted shrink-0">{item.source}</span>
            <span className="text-text-secondary">{item.text}</span>
            {i < mockTicker.length * 2 - 1 && (
              <span className="text-text-muted ml-4">│</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
