const generatedAt = new Date().toISOString().slice(0, 16);

export default function AIBrief() {
  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🤖 AI Intelligence Brief
        </div>
        <div
          className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
          style={{ background: 'rgba(155,89,232,.1)', color: '#9b59e8', border: '1px solid rgba(155,89,232,.2)' }}
        >
          ATLAS AI
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-[10px] text-[12px] leading-[1.55]">
          <SectionHead>■ Situation Overview</SectionHead>
          <p className="text-text-secondary mb-[6px]">
            Global threat level remains <b className="text-high">ELEVATED</b>. Three conflicts at Critical status.
            Russia has escalated strikes against Ukrainian civilian infrastructure in Kharkiv. Iran enrichment
            reaches 83.7% — near weapons grade. Red Sea shipping disruptions continue affecting global energy
            supply chains. US markets positive on strong economic data and continued DOGE savings.
          </p>

          <SectionHead>■ Critical Developments (24h)</SectionHead>
          <ThreatItem num="1" color="#e83b3b">
            <b>UKRAINE:</b> Massive missile barrage on Kharkiv. 14+ missiles, 12 killed. Residential infrastructure
            targeted. Zelensky requests emergency air defense delivery.
          </ThreatItem>
          <ThreatItem num="2" color="#e83b3b">
            <b>SUDAN:</b> RSF advancing on El-Fasher. UN warns potential genocide. 10.7M displaced — largest
            displacement crisis globally.
          </ThreatItem>
          <ThreatItem num="3" color="#e83b3b">
            <b>IRAN:</b> IAEA confirms 83.7% enrichment at Fordow. Technical breakout capability within weeks.
            EU weighing additional sanctions package.
          </ThreatItem>
          <ThreatItem num="4" color="#e8842b">
            <b>RED SEA:</b> Houthi forces claim new attack on commercial vessel. Suez Canal traffic down 40%.
            CENTCOM strikes on Yemen missile facilities.
          </ThreatItem>

          <SectionHead>■ Threat Matrix (72h outlook)</SectionHead>
          <ThreatItem num="🔴" color="#e83b3b">
            Iran enrichment — potential IAEA emergency session trigger
          </ThreatItem>
          <ThreatItem num="🔴" color="#e83b3b">
            Kharkiv escalation — risk of further civilian targeting
          </ThreatItem>
          <ThreatItem num="🟠" color="#e8842b">
            Red Sea shipping — oil price sensitivity if attacks intensify
          </ThreatItem>
          <ThreatItem num="🟠" color="#e8842b">
            Taiwan Strait — PLA exercises near ADIZ, monitor for escalation
          </ThreatItem>

          <SectionHead>■ Market Implications</SectionHead>
          <p className="text-text-secondary mb-[6px]">
            Oil +1.2% on Red Sea disruption. Gold steady as safe haven. VIX low at 14.2 suggests market
            complacency despite geopolitical risks. Trump tariff expansion on Chinese tech may pressure
            semiconductor sector. DOGE savings narrative supporting fiscal optimism.
          </p>

          <SectionHead>■ Watchlist</SectionHead>
          <WatchItem>Munich Security Conference (Feb 14-16): Zelensky keynote, Rubio bilateral meetings</WatchItem>
          <WatchItem>IAEA Board of Governors (Feb 20): Iran enrichment formal review</WatchItem>
          <WatchItem>PLA Taiwan ADIZ activity: 3rd exercise this month</WatchItem>
          <WatchItem>North Korea: ballistic missile test — monitor for ICBM capability</WatchItem>
          <WatchItem>OPEC+ March meeting: production cut extension decision</WatchItem>

          {/* Regen footer */}
          <div className="flex items-center gap-[6px] mt-2 pt-2" style={{ borderTop: '1px solid #14233f' }}>
            <button
              className="font-data text-[9px] px-[10px] py-[3px] rounded-[2px] tracking-[0.5px] cursor-pointer"
              style={{
                border: '1px solid #14233f',
                background: 'rgba(45,122,237,.08)',
                color: '#2d7aed',
              }}
            >
              🔄 Regenerate Brief
            </button>
            <button
              className="font-data text-[9px] px-[10px] py-[3px] rounded-[2px] tracking-[0.5px] cursor-pointer"
              style={{
                border: '1px solid #14233f',
                background: 'rgba(45,122,237,.08)',
                color: '#2d7aed',
              }}
            >
              📄 Full Report (PDF)
            </button>
            <span className="font-data text-[8px] text-text-muted ml-auto">
              Generated: {generatedAt} UTC · Model: Claude Sonnet 4.5 · Sources: ACLED, GDELT, Reuters, CBP
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHead({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-title text-[11px] font-semibold tracking-[1.5px] text-accent mt-2 mb-1 uppercase first:mt-0">
      {children}
    </div>
  );
}

function ThreatItem({ num, color, children }: { num: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[6px] mb-1 py-[3px]">
      <span className="font-data text-[10px] font-bold shrink-0 w-[14px]" style={{ color }}>
        {num}
      </span>
      <span className="text-[11px] text-text-secondary leading-[1.4]">{children}</span>
    </div>
  );
}

function WatchItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-data text-[10px] text-text-muted py-[2px] flex items-start gap-1">
      <span className="text-accent font-bold">›</span>
      <span>{children}</span>
    </div>
  );
}
