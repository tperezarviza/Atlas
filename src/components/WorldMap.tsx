import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { mockConflicts } from '../data/mockConflicts';
import { mockNews } from '../data/mockNews';
import { mockConnections } from '../data/mockConnections';
import { conflictMarkerSize, newsMarkerSize, toneToClass } from '../utils/formatters';
import { connectionColors, connectionDash } from '../utils/colors';
import MapLegend from './MapLegend';

interface WorldMapProps {
  selectedConflictId: string | null;
  onSelectConflict: (id: string) => void;
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

export default function WorldMap({ selectedConflictId, onSelectConflict }: WorldMapProps) {
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
        {mockConnections.map((conn) => {
          const isSelected = selectedConflictId
            ? mockConflicts.some(
                (c) =>
                  c.id === selectedConflictId &&
                  ((Math.abs(c.lat - conn.from[0]) < 1 && Math.abs(c.lng - conn.from[1]) < 1) ||
                    (Math.abs(c.lat - conn.to[0]) < 1 && Math.abs(c.lng - conn.to[1]) < 1))
              )
            : false;

          return (
            <Polyline
              key={conn.id}
              positions={[conn.from, conn.to]}
              pathOptions={{
                color: connectionColors[conn.type] || '#2d7aed',
                weight: 1.5,
                opacity: isSelected ? 0.8 : 0.45,
                dashArray: connectionDash[conn.type] || undefined,
              }}
            >
              <Tooltip sticky className="map-tooltip">
                <div className="tt-meta">{conn.type.replace('_', ' ').toUpperCase()}</div>
                <div className="tt-headline">{conn.label}</div>
              </Tooltip>
            </Polyline>
          );
        })}

        {/* Conflict markers */}
        {mockConflicts.map((conflict) => (
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
        {mockNews.map((news) => (
          <Marker
            key={news.id}
            position={[news.lat, news.lng]}
            icon={getNewsIcon(news.tone)}
            zIndexOffset={news.tone < -5 ? 500 : 0}
          >
            <Tooltip direction="top" offset={[0, -6]} className="map-tooltip">
              <div className="tt-title">📍 {news.source}</div>
              <div className="tt-meta">Tone: {news.tone} · {news.category.toUpperCase()}</div>
              <div className="tt-headline">{news.headline}</div>
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
        <span className="text-critical font-bold text-[16px]">847</span>
        <span className="text-text-muted text-[10px]"> from 142 countries</span>
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
          Last update: <b className="text-text-secondary">2 min ago</b>
        </span>
        <span>
          Sources: <b className="text-text-secondary">GDELT · ACLED · USGS</b>
        </span>
        <span>
          Refresh: <b className="text-text-secondary">15 min</b>
        </span>
      </div>
    </div>
  );
}
