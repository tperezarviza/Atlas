import { mockConflicts } from '../data/mockConflicts';

interface ConflictListProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const severityBg: Record<string, string> = {
  critical: 'rgba(232,59,59,.15)',
  high: 'rgba(232,132,43,.12)',
  medium: 'rgba(212,167,44,.1)',
  low: 'rgba(45,122,237,.1)',
};

const severityColor: Record<string, string> = {
  critical: '#e83b3b',
  high: '#e8842b',
  medium: '#d4a72c',
  low: '#2d7aed',
};

const severityBorder: Record<string, string> = {
  critical: 'rgba(232,59,59,.3)',
  high: 'rgba(232,132,43,.25)',
  medium: 'rgba(212,167,44,.2)',
  low: 'rgba(45,122,237,.2)',
};

export default function ConflictList({ selectedId, onSelect }: ConflictListProps) {
  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          ⚔️ Active Conflicts
        </div>
        <div className="font-data text-[9px] text-text-muted">ACLED Live</div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {mockConflicts.map((conflict) => {
          const isSelected = conflict.id === selectedId;
          return (
            <div
              key={conflict.id}
              className="px-3 py-[10px] cursor-pointer transition-colors duration-150 hover:bg-bg-card-hover"
              style={{
                borderBottom: '1px solid #14233f',
                background: isSelected ? 'rgba(45,122,237,.08)' : undefined,
                borderLeft: isSelected ? '3px solid #2d7aed' : '3px solid transparent',
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
      </div>
    </div>
  );
}
