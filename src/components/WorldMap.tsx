import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api } from '../services/api';
import { mockConflicts } from '../data/mockConflicts';
import { mockNews } from '../data/mockNews';
import { mockConnections } from '../data/mockConnections';
import { conflictMarkerSize, newsMarkerSize, toneToClass } from '../utils/formatters';
import { connectionColors, connectionDash } from '../utils/colors';
import MapLegend from './MapLegend';
import type { Conflict, NewsPoint, Connection } from '../types';

interface WorldMapProps {
  selectedConflictId: string | null;
  onSelectConflict: (id: string) => void;
  conflicts: Conflict[] | null;
  conflictsError: Error | null;
}

const conflictIconCache = new Map<string, L.DivIcon>();
function getConflictIcon(severity: string): L.DivIcon {
  let icon = conflictIconCache.get(severity);
  if (!icon) {
    const size = conflictMarkerSize(severity);
    icon = L.divIcon({
      className: '',
      html: `<div class="conflict-marker ${severity}" style="width:${size}px;height:${size}px"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    conflictIconCache.set(severity, icon);
  }
  return icon;
}

const newsIconCache = new Map<number, L.DivIcon>();
function getNewsIcon(tone: number): L.DivIcon {
  let icon = newsIconCache.get(tone);
  if (!icon) {
    const cls = toneToClass(tone);
    const size = newsMarkerSize(tone);
    icon = L.divIcon({
      className: '',
      html: `<div class="news-marker ${cls === 'positive' ? 'pos' : cls}" style="width:${size}px;height:${size}px"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    newsIconCache.set(tone, icon);
  }
  return icon;
}

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

export default function WorldMap({ selectedConflictId, onSelectConflict, conflicts, conflictsError }: WorldMapProps) {
  const { data: news, error: newsError } = useAutoRefresh<NewsPoint[]>(api.news, 60_000);
  const { data: connections, error: connectionsError } = useAutoRefresh<Connection[]>(api.connections, 240_000);

  const c = conflicts ?? mockConflicts;
  const n = news ?? mockNews;
  const conn = connections ?? mockConnections;

  const hasErrors = !!(conflictsError || newsError || connectionsError);

  return (
    <div className="h-full w-full relative" style={{ border: '1px solid #14233f' }}>
      <MapContainer
        center={[25, 20]}
        zoom={2.5}
        zoomSnap={0.5}
        minZoom={2}
        maxZoom={12}
        zoomControl={false}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
      >
        <MapController />
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* Connection lines */}
        {conn.map((connection) => {
          const isSelected = selectedConflictId
            ? c.some(
                (conflict) =>
                  conflict.id === selectedConflictId &&
                  ((Math.abs(conflict.lat - connection.from[0]) < 1 && Math.abs(conflict.lng - connection.from[1]) < 1) ||
                    (Math.abs(conflict.lat - connection.to[0]) < 1 && Math.abs(conflict.lng - connection.to[1]) < 1))
              )
            : false;

          return (
            <Polyline
              key={connection.id}
              positions={[connection.from, connection.to]}
              pathOptions={{
                color: connectionColors[connection.type] || '#2d7aed',
                weight: 1.5,
                opacity: isSelected ? 0.8 : 0.45,
                dashArray: connectionDash[connection.type] || undefined,
              }}
            >
              <Tooltip sticky className="map-tooltip">
                <div className="tt-meta">{connection.type.replace('_', ' ').toUpperCase()}</div>
                <div className="tt-headline">{connection.label}</div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Conflict markers */}
        {c.map((conflict) => (
          <Marker
            key={conflict.id}
            position={[conflict.lat, conflict.lng]}
            icon={getConflictIcon(conflict.severity)}
            eventHandlers={{
              click: () => onSelectConflict(conflict.id),
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} className="map-tooltip">
              <div className="tt-title">{conflict.name}</div>
              <div className="tt-meta">
                {conflict.severity.toUpperCase()} · {conflict.region} · Since {conflict.since}
              </div>
              <div className="tt-headline">
                ☠️ {conflict.casualties} · 🏃 {conflict.displaced} displaced
                <br />
                Trend:{' '}
                {conflict.trend === 'escalating'
                  ? '▲ ESCALATING'
                  : conflict.trend === 'stable'
                  ? '▬ Stable'
                  : '▼ De-escalating'}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* News markers */}
        {n.map((item) => (
          <Marker
            key={item.id}
            position={[item.lat, item.lng]}
            icon={getNewsIcon(item.tone)}
            zIndexOffset={item.tone < -5 ? 500 : 0}
          >
            <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
              <div className="tt-title">📍 {item.source}</div>
              <div className="tt-meta">Tone: {item.tone} · {item.category.toUpperCase()}</div>
              <div className="tt-headline">{item.headline}</div>
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>

      {/* News count badge - top left */}
      <div
        className="absolute top-2 left-2 z-[800] rounded-[3px] px-[10px] py-[6px] font-data"
        style={{
          background: 'rgba(7,13,26,.9)',
          border: '1px solid #14233f',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[2px]">
          Live News Markers
        </div>
        <span className="text-critical font-bold text-[16px]">{n.length}</span>
        <span className="text-text-muted text-[10px]"> from GDELT</span>
      </div>

      {/* Legend - top right */}
      <MapLegend />

      {/* Bottom stats overlay */}
      <div
        className="absolute bottom-2 left-2 z-[800] flex gap-3 rounded-[3px] px-[10px] py-1 font-data text-[9px] text-text-muted"
        style={{
          background: 'rgba(7,13,26,.85)',
          border: '1px solid #14233f',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span>
          Conflicts: <b className="text-text-secondary">{c.length}</b>
        </span>
        <span>
          Sources: <b className="text-text-secondary">GDELT · ACLED · USGS</b>
        </span>
        <span>
          Refresh: <b className="text-text-secondary">60s</b>
        </span>
        {hasErrors && (
          <span className="text-critical font-bold">
            FEED ERROR
          </span>
        )}
      </div>
    </div>
  );
}
