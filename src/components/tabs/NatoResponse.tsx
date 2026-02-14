import { motion } from 'framer-motion';
import { PurpleBadge } from '../DataBadge';

const NATO_SPENDING = [
  { flag: '🇵🇱', name: 'Poland', gdpPct: 4.12 },
  { flag: '🇺🇸', name: 'United States', gdpPct: 3.38 },
  { flag: '🇬🇷', name: 'Greece', gdpPct: 3.08 },
  { flag: '🇪🇪', name: 'Estonia', gdpPct: 2.73 },
  { flag: '🇱🇹', name: 'Lithuania', gdpPct: 2.54 },
  { flag: '🇷🇴', name: 'Romania', gdpPct: 2.44 },
  { flag: '🇬🇧', name: 'United Kingdom', gdpPct: 2.33 },
  { flag: '🇫🇷', name: 'France', gdpPct: 2.06 },
  { flag: '🇩🇪', name: 'Germany', gdpPct: 1.57 },
  { flag: '🇹🇷', name: 'Turkey', gdpPct: 1.55 },
  { flag: '🇮🇹', name: 'Italy', gdpPct: 1.46 },
  { flag: '🇨🇦', name: 'Canada', gdpPct: 1.37 },
  { flag: '🇪🇸', name: 'Spain', gdpPct: 1.28 },
  { flag: '🇧🇪', name: 'Belgium', gdpPct: 1.13 },
];

const AID_PACKAGES = [
  { name: 'NATO Comprehensive Package', amount: '$43B', year: '2024' },
  { name: 'US FY2025 Supplemental', amount: '$61B', year: '2025' },
  { name: 'EU Military Aid Fund', amount: '€6.1B', year: '2024' },
  { name: 'UK Military Aid', amount: '£4.6B', year: '2024' },
];

// Max value for the bar scale (round up from highest)
const BAR_MAX = 4.5;
const TARGET_PCT = 2.0;
const TARGET_BAR_POSITION = (TARGET_PCT / BAR_MAX) * 100;

export default function NatoResponse() {
  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🛡️ NATO Response
        </div>
        <PurpleBadge label="STATIC" />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {/* Defense Spending vs 2% Target */}
          <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
            <div className="px-3 py-[6px]">
              <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[8px]">
                📊 Defense Spending vs 2% GDP Target
              </div>
              <div className="flex flex-col gap-[5px]">
                {NATO_SPENDING.map((member) => {
                  const meetsTarget = member.gdpPct >= TARGET_PCT;
                  const barColor = meetsTarget ? '#00ff88' : '#ff3b3b';
                  const barWidth = Math.min((member.gdpPct / BAR_MAX) * 100, 100);

                  return (
                    <div key={member.name}>
                      <div className="flex items-center justify-between mb-[1px]">
                        <div className="flex items-center gap-[5px]">
                          <span className="text-[11px]">{member.flag}</span>
                          <span className="font-data text-[10px] text-text-secondary">
                            {member.name}
                          </span>
                        </div>
                        <span
                          className="font-data text-[10px] font-semibold"
                          style={{ color: barColor }}
                        >
                          {member.gdpPct.toFixed(2)}%
                        </span>
                      </div>
                      {/* Bar with 2% target line */}
                      <div
                        className="h-[5px] rounded-[1px] relative"
                        style={{ background: 'rgba(255,255,255,.04)' }}
                      >
                        {/* Filled bar */}
                        <div
                          className="h-full rounded-[1px] transition-[width] duration-500"
                          style={{
                            width: `${barWidth}%`,
                            background: barColor,
                            opacity: 0.8,
                          }}
                        />
                        {/* 2% target line */}
                        <div
                          className="absolute top-[-1px] bottom-[-1px] w-[1px]"
                          style={{
                            left: `${TARGET_BAR_POSITION}%`,
                            borderLeft: '1px dashed rgba(255,255,255,.3)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 mt-[8px] font-data text-[8px] text-text-muted">
                <div className="flex items-center gap-[4px]">
                  <div className="w-[8px] h-[3px] rounded-[1px]" style={{ background: '#00ff88' }} />
                  <span>Meets 2% target</span>
                </div>
                <div className="flex items-center gap-[4px]">
                  <div className="w-[8px] h-[3px] rounded-[1px]" style={{ background: '#ff3b3b' }} />
                  <span>Below 2% target</span>
                </div>
                <div className="flex items-center gap-[4px]">
                  <div className="w-[1px] h-[8px]" style={{ borderLeft: '1px dashed rgba(255,255,255,.3)' }} />
                  <span>2% line</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Aid Packages */}
          <div>
            <div className="px-3 py-[6px]">
              <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[6px]">
                📦 Recent Aid Packages
              </div>
              <div className="flex flex-col gap-[4px]">
                {AID_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.name}
                    className="flex items-center justify-between px-[6px] py-[5px] rounded-[2px]"
                    style={{ background: 'rgba(255,255,255,.02)' }}
                  >
                    <div className="flex flex-col">
                      <span className="font-data text-[10px] text-text-secondary">
                        {pkg.name}
                      </span>
                      <span className="font-data text-[8px] text-text-muted">
                        {pkg.year}
                      </span>
                    </div>
                    <span className="font-data text-[12px] font-bold text-accent">
                      {pkg.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
