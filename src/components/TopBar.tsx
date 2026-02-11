import { useClock } from '../hooks/useClock';

export default function TopBar() {
  const { utc, buenosAires } = useClock();

  return (
    <div
      className="h-full flex items-center px-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #0d1628, #080f1e)',
        borderBottom: '1px solid #14233f',
      }}
    >
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, #2d7aed, transparent)' }}
      />

      {/* Logo */}
      <div className="font-title font-bold text-[20px] tracking-[3px] text-white mr-2">
        <span className="text-critical">▣</span> ATLAS
      </div>

      {/* LIVE badge */}
      <div
        className="flex items-center gap-[5px] rounded-[3px] px-2 py-[2px] font-data text-[10px] font-semibold tracking-[1px] mr-4"
        style={{
          background: 'rgba(232,59,59,.12)',
          border: '1px solid rgba(232,59,59,.3)',
          color: '#e83b3b',
        }}
      >
        <div
          className="w-[6px] h-[6px] rounded-full"
          style={{
            background: '#e83b3b',
            animation: 'pulse-dot 1.5s infinite',
          }}
        />
        LIVE
      </div>

      {/* Clocks */}
      <div className="font-data text-[13px] text-text-secondary tracking-[0.5px] mr-[6px]">
        UTC <b className="text-text-primary">{utc}</b>
      </div>
      <div className="w-px h-6 mx-3" style={{ background: '#14233f' }} />
      <div className="font-data text-[13px] text-text-secondary tracking-[0.5px]">
        BsAs <b className="text-text-primary">{buenosAires}</b>
      </div>
      <div className="w-px h-6 mx-3" style={{ background: '#14233f' }} />

      {/* KPIs */}
      <div className="flex gap-[2px] flex-1 justify-center">
        <KPI label="Active Conflicts" value="23" colorClass="text-critical" />
        <KPI label="Critical" value="3" colorClass="text-critical" />
        <KPI label="News Markers" value="847" />
        <KPI label="BTC" value="$97,234" colorClass="text-positive" />
        <KPI label="WTI Oil" value="$72.34" colorClass="text-medium" />
        <KPI label="Gold" value="$2,847" />
        <KPI label="S&P 500" value="6,127" colorClass="text-positive" />
        <KPI label="VIX" value="14.2" />
      </div>

      {/* Threat Level */}
      <div
        className="flex items-center gap-[6px] rounded-[3px] px-[10px] py-1 ml-2"
        style={{
          background: 'rgba(232,59,59,.08)',
          border: '1px solid rgba(232,59,59,.2)',
        }}
      >
        <div className="font-data text-[9px] text-text-muted tracking-[1px]">THREAT</div>
        <div className="font-title text-[20px] font-bold text-high">3</div>
      </div>

      {/* Bell */}
      <div className="relative cursor-pointer ml-3 text-[18px] text-text-secondary">
        🔔
        <span
          className="absolute -top-1 -right-[6px] font-data text-[8px] font-bold text-white rounded-[6px] px-1"
          style={{ background: '#e83b3b' }}
        >
          5
        </span>
      </div>
    </div>
  );
}

function KPI({ label, value, colorClass }: { label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex flex-col items-center px-[14px] py-[2px]">
      <div className="text-[8px] uppercase tracking-[1.5px] text-text-muted font-data font-medium">
        {label}
      </div>
      <div className={`font-data text-[15px] font-semibold ${colorClass || 'text-text-primary'}`}>
        {value}
      </div>
    </div>
  );
}
