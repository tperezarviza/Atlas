import { mockLeaderFeed } from '../data/mockLeaderFeed';

const borderColors: Record<string, string> = {
  trump: '#e83b3b',
  musk: '#9b59e8',
  military: '#e8842b',
  leader: '#2d7aed',
};

export default function LeaderFeed() {
  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          📡 Leader Feed
        </div>
        <div
          className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
          style={{ background: 'rgba(232,59,59,.1)', color: '#e83b3b', border: '1px solid rgba(232,59,59,.2)' }}
        >
          LIVE
        </div>
      </div>

      {/* Feed items */}
      <div className="flex-1 overflow-y-auto">
        {mockLeaderFeed.map((item) => (
          <div
            key={item.id}
            className="px-3 py-[10px] cursor-pointer transition-colors duration-200 hover:bg-bg-card-hover"
            style={{
              borderBottom: '1px solid #14233f',
              borderLeft: `3px solid ${borderColors[item.category] || '#2d7aed'}`,
            }}
          >
            {/* Meta row */}
            <div className="flex items-center gap-[6px] mb-1">
              <span className="text-[14px]">{item.flag}</span>
              <span className="font-data text-[10px] text-accent font-medium">{item.handle}</span>
              <span className="font-data text-[9px] text-text-muted ml-auto tracking-[0.3px]">{item.source}</span>
              <span className="font-data text-[9px] text-text-muted">{item.time}</span>
            </div>

            {/* Role */}
            <div className="text-[9px] text-text-muted font-data mb-1">{item.role}</div>

            {/* Text */}
            <div className="text-[13px] leading-[1.45] text-text-primary">
              <FeedText text={item.text} />
            </div>

            {/* Engagement */}
            {item.engagement && (
              <div className="flex gap-3 mt-[6px] font-data text-[9px] text-text-muted">
                {item.engagement}
              </div>
            )}

            {/* Tags */}
            <div className="flex gap-1 mt-[5px]">
              {item.tags.map((tag) => (
                <span
                  key={tag}
                  className="font-data text-[8px] px-[5px] py-[1px] rounded-[2px]"
                  style={{
                    background: 'rgba(45,122,237,.1)',
                    color: '#2d7aed',
                    border: '1px solid rgba(45,122,237,.2)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Renders text safely — supports **bold** markers without innerHTML */
function FeedText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold" style={{ color: '#d4a72c' }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
