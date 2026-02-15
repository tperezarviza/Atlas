import { useState, useEffect, useRef } from 'react';

const BOOT_LINES = [
  '[SYS] ATLAS v4.0 — Geopolitical Intelligence Platform',
  '[NET] GDELT Event Database.................. OK',
  '[NET] ACLED Conflict Feed................... OK',
  '[NET] Market feeds (commodities/forex)...... OK',
  '[AI]  Intelligence brief engine............. OK',
  '[MAP] Cartographic renderer (Leaflet)....... OK',
  '[SEC] OPSEC protocols....................... PASS',
  '[SYS] All systems nominal.',
];

interface BootSequenceProps {
  onComplete: () => void;
}

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLines(prev => {
        const next = prev + 1;
        if (next >= BOOT_LINES.length) {
          clearInterval(interval);
          if (!completedRef.current) {
            completedRef.current = true;
            setTimeout(() => onCompleteRef.current(), 500);
          }
        }
        return next;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const progress = (visibleLines / BOOT_LINES.length) * 100;

  return (
    <div
      className="h-screen w-screen flex flex-col items-center justify-center"
      style={{ background: '#000000' }}
    >
      <div className="w-[460px] max-w-[90vw]">
        {/* Logo */}
        <div
          className="font-title text-[28px] font-bold tracking-[6px] text-center mb-6"
          style={{ color: '#ffc832' }}
        >
          ATLAS
        </div>

        {/* Boot lines */}
        <div className="font-data text-[11px] leading-[1.8] mb-4" style={{ minHeight: 200 }}>
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className="boot-line-enter"
              style={{
                color: line.includes('PASS')
                  ? '#00ff88'
                  : line.includes('OK')
                  ? '#c8a020'
                  : line.includes('nominal')
                  ? '#00ff88'
                  : '#7a6418',
              }}
            >
              {line}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div
          className="h-[3px] rounded-[1px] overflow-hidden"
          style={{ background: 'rgba(255,200,50,.1)' }}
        >
          <div
            className="h-full rounded-[1px]"
            style={{
              width: `${progress}%`,
              background: '#ffc832',
              transition: 'width 0.2s ease-out',
            }}
          />
        </div>
        <div className="font-data text-[9px] text-text-muted text-center mt-2 tracking-[1px]">
          INITIALIZING SYSTEMS
        </div>
      </div>
    </div>
  );
}
