import { useState } from 'react';
import type { MapLayerId } from '../types';

interface MapLegendProps {
  layers: Record<MapLayerId, boolean>;
  onToggle: (id: MapLayerId) => void;
  counts?: Record<MapLayerId, number>;
}

const LAYER_META: { id: MapLayerId; icon: string; label: string }[] = [
  { id: 'flights', icon: '✈', label: 'Military Flights' },
  { id: 'shipping', icon: '⚓', label: 'Shipping Chokepoints' },
  { id: 'internet', icon: '📡', label: 'Internet Shutdowns' },
  { id: 'nuclear', icon: '☢', label: 'Nuclear Facilities' },
  { id: 'armedGroups', icon: '🎯', label: 'Armed Groups' },
  { id: 'vessels', icon: '🚢', label: 'Vessel Traffic' },
  { id: 'naturalEvents', icon: '🌍', label: 'Natural Events' },
  { id: 'earthquakes', icon: '🔴', label: 'Earthquakes (M4.5+)' },
  { id: 'bases', icon: '🏛', label: 'Military Bases' },
  { id: 'cables', icon: '🔗', label: 'Undersea Cables' },
  { id: 'pipelines', icon: '🛢', label: 'Pipelines' },
  { id: 'convergence', icon: '◉', label: 'Convergence Zones' },
  { id: 'surges', icon: '⚡', label: 'Flight Surges' },
];

export default function MapLegend({ layers, onToggle, counts }: MapLegendProps) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className="absolute top-2 right-2 z-[800] px-[10px] py-2"
      style={{
        background: 'rgba(0,0,0,.85)',
        border: '1px solid rgba(255,200,50,0.10)',
        backdropFilter: 'blur(24px)',
        borderRadius: '10px',
      }}
    >
      <div
        className="font-title text-[10px] tracking-[1.5px] mb-[6px] uppercase cursor-pointer"
        onClick={() => setOpen(!open)}
      >
        Map Layers {open ? '▾' : '▸'}
      </div>

      {open && (
        <div className="space-y-[3px]">
          {/* News legend — color by age */}
          <LegendDot color="#ff4444" label="News: < 1h" />
          <LegendDot color="#ff8844" label="News: 1-6h" />
          <LegendDot color="#ffaa44" label="News: 6-24h" opacity={0.85} />
          <LegendDot color="#888855" label="News: 1-2 days" opacity={0.6} />
          <LegendDot color="#666655" label="News: 2-3 days" opacity={0.4} />

          <div className="h-[6px]" />

          {/* Conflict legend */}
          <LegendDot color="#ff3b3b" label="Conflict: Critical" size={12} border />
          <LegendDot color="#ff8c00" label="Conflict: High" size={10} border />

          <div className="h-[6px]" />

          {/* Connection legend */}
          <LegendLine color="#ff3b3b" label="Proxy War" />
          <LegendLine color="#ff8c00" label="Arms Flow" dashed />
          <LegendLine color="#ffc832" label="Alliance" />
          <LegendLine color="#d4a72c" label="Spillover" dotted />
          <LegendLine color="#a855f7" label="Cyber" />

          <div className="h-[6px]" />

          {/* Toggle layers */}
          <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[2px]">
            Toggle Layers
          </div>
          {LAYER_META.map(({ id, icon, label }) => (
            <LayerToggle
              key={id}
              icon={icon}
              label={label}
              active={layers[id]}
              count={counts?.[id]}
              onToggle={() => onToggle(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LayerToggle({ icon, label, active, count, onToggle }: {
  icon: string;
  label: string;
  active: boolean;
  count?: number;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-[6px] font-data text-[9px] cursor-pointer hover:text-text-primary select-none"
      style={{ color: active ? '#ffc832' : '#7a6418' }}
      onClick={onToggle}
    >
      {/* Toggle switch */}
      <div
        className="shrink-0 rounded-full relative"
        style={{
          width: 22,
          height: 12,
          background: active ? 'rgba(255,200,50,.35)' : 'rgba(122,100,24,.3)',
          transition: 'background .15s',
        }}
      >
        <div
          className="absolute top-[1px] rounded-full"
          style={{
            width: 10,
            height: 10,
            background: active ? '#ffc832' : '#7a6418',
            left: active ? 11 : 1,
            transition: 'left .15s, background .15s',
          }}
        />
      </div>
      <span>{icon}</span>
      <span>{label}</span>
      {count != null && count > 0 && (
        <span
          className="text-[8px] px-[3px] rounded-[2px]"
          style={{ background: active ? 'rgba(255,200,50,.15)' : 'rgba(122,100,24,.1)', color: active ? '#ffc832' : '#7a6418' }}
        >
          {count}
        </span>
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
          border: border ? '2px solid rgba(255,200,50,.3)' : undefined,
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
