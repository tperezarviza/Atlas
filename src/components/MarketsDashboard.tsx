import { mockMarketSections, mockMacro, mockBorderStats } from '../data/mockMarkets';

export default function MarketsDashboard() {
  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          💹 Markets & Indicators
        </div>
        <div
          className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
          style={{ background: 'rgba(40,179,90,.1)', color: '#28b35a', border: '1px solid rgba(40,179,90,.2)' }}
        >
          LIVE
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Market sections */}
        {mockMarketSections.map((section) => (
          <div key={section.title} className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
            <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
              {section.icon} {section.title}
            </div>
            {section.items.map((item) => (
              <div
                key={item.name}
                className="flex items-center px-[10px] py-[3px] transition-colors duration-150 hover:bg-bg-card-hover"
              >
                <span className="font-data text-[10px] text-text-secondary w-[80px] shrink-0">
                  {item.name}
                </span>
                <div className="flex-1 h-5 flex items-end gap-px px-[6px]">
                  {item.sparkData.map((val, i) => (
                    <div
                      key={i}
                      className="rounded-t-[1px] transition-[height] duration-300"
                      style={{
                        width: 3,
                        height: `${val}%`,
                        background: item.color || '#2d7aed',
                        opacity: 0.5,
                      }}
                    />
                  ))}
                </div>
                <span className="font-data text-[11px] font-semibold text-text-primary w-[72px] text-right">
                  {item.price}
                </span>
                <span
                  className={`font-data text-[10px] w-[60px] text-right font-medium ${
                    item.direction === 'up'
                      ? 'text-positive'
                      : item.direction === 'down'
                      ? 'text-critical'
                      : 'text-text-muted'
                  }`}
                >
                  {item.delta}
                </span>
              </div>
            ))}
          </div>
        ))}

        {/* US Macro */}
        <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
          <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
            🇺🇸 US Macro
          </div>
          {mockMacro.map((item) => (
            <div key={item.label} className="flex justify-between px-[10px] py-[3px]">
              <span className="font-data text-[10px] text-text-muted">{item.label}</span>
              <span
                className="font-data text-[10px] font-medium"
                style={{ color: item.color || '#d8e2f0' }}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Border Security */}
        <div className="py-[6px]" style={{ borderBottom: '1px solid #14233f' }}>
          <div className="font-data text-[8px] tracking-[1.5px] text-text-muted px-[10px] mb-[2px] uppercase">
            🛃 Border Security (FY26)
          </div>
          {mockBorderStats.map((stat) => (
            <div key={stat.label} className="flex justify-between items-center px-[10px] py-1">
              <span className="font-data text-[10px] text-text-muted">{stat.label}</span>
              <span className="font-data text-[12px] font-semibold" style={{ color: stat.color || '#d8e2f0' }}>
                {stat.value}
                {stat.delta && (
                  <span className="font-data text-[9px] ml-1" style={{ color: stat.color || '#d8e2f0' }}>
                    {stat.delta}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
