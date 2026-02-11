import { useState } from 'react';

export default function MapLegend() {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="absolute top-2 right-2 z-[800] rounded-[3px] px-[10px] py-2"
      style={{
        background: 'rgba(7,13,26,.9)',
        border: '1px solid #14233f',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="font-title text-[10px] tracking-[1.5px] text-text-secondary mb-[6px] uppercase cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        Map Layers {open ? '▾' : '▸'}
      </div>

      {open && (
        <div className="space-y-[3px]">
          {/* News legend */}
          <LegendDot color="#e83b3b" label="News: Crisis (tone < -5)" />
          <LegendDot color="#e8842b" label="News: Negative" />
          <LegendDot color="#d4a72c" label="News: Neutral" opacity={0.5} />
          <LegendDot color="#28b35a" label="News: Positive" opacity={0.5} />

          <div className="h-[6px]" />

          {/* Conflict legend */}
          <LegendDot color="#e83b3b" label="Conflict: Critical" size={12} border />
          <LegendDot color="#e8842b" label="Conflict: High" size={10} border />

          <div className="h-[6px]" />

          {/* Connection legend */}
          <LegendLine color="#e83b3b" label="Proxy War" />
          <LegendLine color="#e8842b" label="Arms Flow" dashed />
          <LegendLine color="#2d7aed" label="Alliance" />
          <LegendLine color="#d4a72c" label="Spillover" dotted />
          <LegendLine color="#9b59e8" label="Cyber" />
        </div>
      )}
    </div>
  );
}

function LegendDot({
  color,
  label,
  size = 8,
  opacity = 1,
  border = false,
}: {
  color: string;
  label: string;
  size?: number;
  opacity?: number;
  border?: boolean;
}) {
  return (
    <div className="flex items-center gap-[6px] font-data text-[9px] text-text-secondary cursor-pointer hover:text-text-primary">
      <div
        className="rounded-full shrink-0"
        style={{
          width: size,
          height: size,
          background: color,
          opacity,
          border: border ? '2px solid rgba(255,255,255,.3)' : undefined,
        }}
      />
      {label}
    </div>
  );
}

function LegendLine({
  color,
  label,
  dashed = false,
  dotted = false,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  dotted?: boolean;
}) {
  return (
    <div className="flex items-center gap-[6px] font-data text-[9px] text-text-secondary cursor-pointer hover:text-text-primary">
      <div
        className="shrink-0 rounded-[1px]"
        style={{
          width: 20,
          height: dashed || dotted ? 0 : 2,
          background: dashed || dotted ? 'transparent' : color,
          borderTop: dashed ? `2px dashed ${color}` : dotted ? `2px dotted ${color}` : undefined,
        }}
      />
      {label}
    </div>
  );
}
