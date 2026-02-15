import { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Polyline, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { conflictMarkerSize, newsMarkerSize, toneToClass } from '../utils/formatters';
import { connectionColors, connectionDash } from '../utils/colors';
import MapLegend from './MapLegend';
import ConflictDetailOverlay from './ConflictDetailOverlay';
import { nuclearFacilities } from '../data/nuclearFacilities';
import FlightMarkers from './map/FlightMarkers';
import ChokepointMarkers from './map/ChokepointMarkers';
import InternetShutdownMarkers from './map/InternetShutdownMarkers';
import NuclearMarkers from './map/NuclearMarkers';
import ArmedGroupMarkers from './map/ArmedGroupMarkers';
import VesselMarkers from './map/VesselMarkers';
import NaturalEventMarkers from './map/NaturalEventMarkers';
import EarthquakeMarkers from './map/EarthquakeMarkers';
import BasesMarkers from './map/BasesMarkers';
import CableLines from './map/CableLines';
import PipelineLines from './map/PipelineLines';
import ConvergenceMarkers from './map/ConvergenceMarkers';
import type { GeoJSONCollection } from '../services/api';
import type { Conflict, NewsPoint, Connection, MapLayerId, MilitaryFlight, Chokepoint, InternetIncident, ArmedGroup, Vessel, NaturalEvent, Earthquake, ConvergenceHotspot } from '../types';

const NEWS_INTERVAL = 900_000;        // 15 min
const CONNECTIONS_INTERVAL = 21_600_000; // 6 hours

interface WorldMapProps {
  selectedConflictId: string | null;
  onSelectConflict: (id: string) => void;
  onCountryClick?: (code: string) => void;
  conflicts: Conflict[] | null;
  conflictsLoading: boolean;
  conflictsError: Error | null;
  conflictsLastUpdate: Date | null;
  viewCenter?: [number, number];
  viewZoom?: number;
  activeTab?: string;
}

const DEFAULT_LAYERS: Record<MapLayerId, boolean> = {
  flights: true,
  shipping: false,
  internet: false,
  nuclear: false,
  armedGroups: false,
  vessels: false,
  naturalEvents: false,
  earthquakes: false,
  bases: false,
  cables: false,
  pipelines: false,
  convergence: false,
};

const ALLOWED_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

const conflictIconCache = new Map<string, L.DivIcon>();
function getConflictIcon(severity: string): L.DivIcon {
  const safeSeverity = ALLOWED_SEVERITIES.has(severity) ? severity : 'medium';
  let icon = conflictIconCache.get(safeSeverity);
  if (!icon) {
    const size = conflictMarkerSize(safeSeverity);
    icon = L.divIcon({
      className: '',
      html: `<div class="conflict-marker ${safeSeverity}" style="width:${size}px;height:${size}px"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    conflictIconCache.set(safeSeverity, icon);
  }
  return icon;
}

// FIX AUDIT-1: Bucket tone to integer to prevent unbounded cache growth
const newsIconCache = new Map<number, L.DivIcon>();
function getNewsIcon(tone: number): L.DivIcon {
  const bucketedTone = Math.round(tone);
  let icon = newsIconCache.get(bucketedTone);
  if (!icon) {
    const cls = toneToClass(tone);
    const size = newsMarkerSize(tone);
    icon = L.divIcon({
      className: '',
      html: `<div class="news-marker ${cls === 'positive' ? 'pos' : cls}" style="width:${size}px;height:${size}px"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    newsIconCache.set(bucketedTone, icon);
  }
  return icon;
}

function MapController() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const handleResize = () => {
      requestAnimationFrame(() => map.invalidateSize());
    };
    window.addEventListener('resize', handleResize);
    document.addEventListener('fullscreenchange', handleResize);

    // ResizeObserver for panel resize (react-resizable-panels)
    const container = map.getContainer()?.parentElement;
    let ro: ResizeObserver | null = null;
    if (container) {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
      ro.observe(container);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('fullscreenchange', handleResize);
      ro?.disconnect();
    };
  }, [map]);
  return null;
}

function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevRef = useRef({ center, zoom });
  useEffect(() => {
    if (prevRef.current.center[0] !== center[0] || prevRef.current.center[1] !== center[1] || prevRef.current.zoom !== zoom) {
      map.flyTo(center, zoom, { duration: 0.5 });
      prevRef.current = { center, zoom };
    }
  }, [map, center, zoom]);
  return null;
}

function MapClickHandler({ onMapClick }: { onMapClick: () => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onMapClick();
    map.on('click', handler);
    return () => { map.off('click', handler); };
  }, [map, onMapClick]);
  return null;
}

function ZoomTracker({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoomChange(map.getZoom());
    map.on('zoomend', handler);
    handler(); // initial zoom
    return () => { map.off('zoomend', handler); };
  }, [map, onZoomChange]);
  return null;
}

const GEOJSON_STYLE: L.PathOptions = {
  fillOpacity: 0,
  weight: 0.5,
  color: 'rgba(255,200,50,0.05)',
  opacity: 1,
};

const GEOJSON_HOVER_STYLE: L.PathOptions = {
  fillOpacity: 0.08,
  fillColor: '#ffc832',
  weight: 1,
  color: 'rgba(255,200,50,0.15)',
};

export default function WorldMap({ selectedConflictId, onSelectConflict, onCountryClick, conflicts, conflictsError, viewCenter, viewZoom, activeTab }: WorldMapProps) {
  const { data: news, error: newsError } = useApiData<NewsPoint[]>(api.news, NEWS_INTERVAL);
  const { data: connections, error: connectionsError } = useApiData<Connection[]>(api.connections, CONNECTIONS_INTERVAL);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  const onCountryClickRef = useRef(onCountryClick);
  onCountryClickRef.current = onCountryClick;
  const [zoomLevel, setZoomLevel] = useState(2.5);
  const [focusedConflict, setFocusedConflict] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Reset focused conflict when view changes
  const prevViewRef = useRef({ viewCenter, viewZoom });
  useEffect(() => {
    if (prevViewRef.current.viewCenter !== viewCenter || prevViewRef.current.viewZoom !== viewZoom) {
      setFocusedConflict(null);
      prevViewRef.current = { viewCenter, viewZoom };
    }
  }, [viewCenter, viewZoom]);

  const handleMapClick = useCallback(() => {
    onSelectConflict('');
    setFocusedConflict(null);
  }, [onSelectConflict]);

  // Layer visibility state — reset on tab change
  const [layers, setLayers] = useState(DEFAULT_LAYERS);
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      // Auto-enable internet layer on cyber tab
      if (activeTab === 'cyber') {
        setLayers({ ...DEFAULT_LAYERS, internet: true });
      } else {
        setLayers(DEFAULT_LAYERS);
      }
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  const toggleLayer = useCallback((id: MapLayerId) => {
    setLayers(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const handleZoomChange = useCallback((z: number) => setZoomLevel(z), []);

  // Conditional data fetching
  const { data: flights } = useApiData<MilitaryFlight[]>(() => api.militaryFlights(), 60_000, { enabled: layers.flights });
  const { data: chokepoints } = useApiData<Chokepoint[]>(api.shipping, 300_000, { enabled: layers.shipping });
  const { data: shutdowns } = useApiData<InternetIncident[]>(api.internetIncidents, 900_000, { enabled: layers.internet });
  const { data: armedGroupsData } = useApiData<ArmedGroup[]>(api.armedGroups, 3_600_000, { enabled: layers.armedGroups });
  const { data: vesselsData } = useApiData<Vessel[]>(api.vessels, 120_000, { enabled: layers.vessels });
  const { data: naturalEventsData } = useApiData<NaturalEvent[]>(api.naturalEvents, 900_000, { enabled: layers.naturalEvents });
  const { data: earthquakesData } = useApiData<Earthquake[]>(api.earthquakes, 600_000, { enabled: layers.earthquakes });
  const { data: basesData } = useApiData<GeoJSONCollection>(api.layerBases, 3_600_000, { enabled: layers.bases });
  const { data: cablesData } = useApiData<GeoJSONCollection>(api.layerCables, 3_600_000, { enabled: layers.cables });
  const { data: pipelinesData } = useApiData<GeoJSONCollection>(api.layerPipelines, 3_600_000, { enabled: layers.pipelines });
  const { data: convergenceData } = useApiData<ConvergenceHotspot[]>(api.geoConvergence, 1_800_000, { enabled: layers.convergence });

  // Lazy-load GeoJSON with abort cleanup
  useEffect(() => {
    const controller = new AbortController();
    fetch('/data/countries-110m.geojson', { signal: controller.signal })
      .then(r => {
        if (!r.ok) throw new Error(`GeoJSON fetch failed: ${r.status}`);
        return r.json();
      })
      .then(data => { if (!controller.signal.aborted) setGeoData(data); })
      .catch(err => { if (!controller.signal.aborted) console.warn('[MAP] GeoJSON load failed:', err); });
    return () => controller.abort();
  }, []);

  const c = conflicts ?? [];
  const n = news ?? [];
  const conn = connections ?? [];

  const hasErrors = !!(conflictsError || newsError || connectionsError);

  const onEachFeature = useCallback((feature: GeoJSON.Feature, layer: L.Layer) => {
    const pathLayer = layer as L.Path;

    pathLayer.on({
      mouseover: () => {
        pathLayer.setStyle(GEOJSON_HOVER_STYLE);
      },
      mouseout: () => {
        pathLayer.setStyle(GEOJSON_STYLE);
      },
      click: (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        const code = feature.properties?.ISO_A2;
        if (code && onCountryClickRef.current) {
          onCountryClickRef.current(code);
        }
      },
    });
  }, []);

  return (
    <div className="h-full w-full relative" style={{ border: '1px solid rgba(255,200,50,0.10)' }}>
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
        <ZoomTracker onZoomChange={handleZoomChange} />
        <MapClickHandler onMapClick={handleMapClick} />
        {focusedConflict && <MapFlyTo center={focusedConflict.center} zoom={focusedConflict.zoom} />}
        {viewCenter && viewZoom != null && !focusedConflict && <MapFlyTo center={viewCenter} zoom={viewZoom} />}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* GeoJSON country borders — renders BELOW markers */}
        {geoData && (
          <GeoJSON
            data={geoData}
            style={() => GEOJSON_STYLE}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Connection lines */}
        {conn.map((connection) => {
          const hasSelection = !!selectedConflictId;
          const isSelected = selectedConflictId
            ? c.some(
                (conflict) =>
                  conflict.id === selectedConflictId &&
                  ((Math.abs(conflict.lat - connection.from[0]) < 1 && Math.abs(conflict.lng - connection.from[1]) < 1) ||
                    (Math.abs(conflict.lat - connection.to[0]) < 1 && Math.abs(conflict.lng - connection.to[1]) < 1))
              )
            : false;

          const lineColor = connectionColors[connection.type] || '#ffc832';

          return (
            <Fragment key={connection.id}>
              {/* Glow line for selected connections */}
              {isSelected && (
                <Polyline
                  positions={[connection.from, connection.to]}
                  pathOptions={{
                    color: lineColor,
                    weight: 6,
                    opacity: 0.15,
                    dashArray: undefined,
                  }}
                />
              )}
              <Polyline
                positions={[connection.from, connection.to]}
                pathOptions={{
                  color: lineColor,
                  weight: isSelected ? 2.5 : 1.5,
                  opacity: isSelected ? 0.9 : (hasSelection ? 0.1 : 0.45),
                  dashArray: connectionDash[connection.type] || undefined,
                }}
              >
                <Tooltip sticky className="map-tooltip">
                  <div className="tt-meta">{connection.type.replace('_', ' ').toUpperCase()}</div>
                  <div className="tt-headline">{connection.label}</div>
                </Tooltip>
              </Polyline>
            </Fragment>
          );
        })}

        {/* Conflict markers */}
        {c.map((conflict) => (
          <Marker
            key={conflict.id}
            position={[conflict.lat, conflict.lng]}
            icon={getConflictIcon(conflict.severity)}
            eventHandlers={{
              click: (e) => {
                L.DomEvent.stopPropagation(e as unknown as L.LeafletMouseEvent);
                onSelectConflict(conflict.id);
                setFocusedConflict({ center: [conflict.lat, conflict.lng], zoom: 6 });
              },
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

        {/* Toggle layers */}
        <FlightMarkers data={flights} visible={layers.flights} />
        <ChokepointMarkers data={chokepoints} visible={layers.shipping} />
        <InternetShutdownMarkers data={shutdowns} visible={layers.internet} />
        <NuclearMarkers visible={layers.nuclear} />
        <ArmedGroupMarkers data={armedGroupsData} visible={layers.armedGroups} />
        <VesselMarkers data={vesselsData} visible={layers.vessels} zoomLevel={zoomLevel} />
        <NaturalEventMarkers data={naturalEventsData} visible={layers.naturalEvents} />
        <EarthquakeMarkers data={earthquakesData} visible={layers.earthquakes} />
        <BasesMarkers data={basesData} visible={layers.bases} />
        <CableLines data={cablesData} visible={layers.cables} />
        <PipelineLines data={pipelinesData} visible={layers.pipelines} />
        <ConvergenceMarkers data={convergenceData} visible={layers.convergence} />
      </MapContainer>

      {/* News count badge - top left */}
      <div
        className="absolute top-2 left-2 z-[800] rounded-[3px] px-[10px] py-[6px] font-data"
        style={{
          background: 'rgba(0,0,0,.85)',
          border: '1px solid rgba(255,200,50,0.10)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <div className="text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[2px]">
          Live News Markers
        </div>
        <span className="text-critical font-bold text-[16px]">{n.length}</span>
        <span className="text-text-muted text-[10px]"> from GDELT</span>
      </div>

      {/* Legend - top right */}
      <MapLegend
        layers={layers}
        onToggle={toggleLayer}
        counts={{
          flights: flights?.filter(f => !f.on_ground).length ?? 0,
          shipping: chokepoints?.length ?? 0,
          internet: shutdowns?.length ?? 0,
          nuclear: nuclearFacilities.length,
          armedGroups: armedGroupsData?.length ?? 0,
          vessels: vesselsData?.length ?? 0,
          naturalEvents: naturalEventsData?.length ?? 0,
          earthquakes: earthquakesData?.length ?? 0,
          bases: basesData?.features?.length ?? 0,
          cables: cablesData?.features?.length ?? 0,
          pipelines: pipelinesData?.features?.length ?? 0,
          convergence: convergenceData?.length ?? 0,
        }}
      />

      {/* Bottom stats overlay */}
      <div
        className="absolute bottom-2 left-2 z-[800] flex gap-3 rounded-[3px] px-[10px] py-1 font-data text-[9px] text-text-muted"
        style={{
          background: 'rgba(0,0,0,.85)',
          border: '1px solid rgba(255,200,50,0.10)',
          backdropFilter: 'blur(24px)',
        }}
      >
        <span>
          Conflicts: <b className="text-text-secondary">{c.length}</b>
        </span>
        <span>
          Sources: <b className="text-text-secondary">GDELT · ACLED · USGS</b>
        </span>
        <span>
          Refresh: <b className="text-text-secondary">15m</b>
        </span>
        {zoomLevel > 8 && layers.vessels && (
          <span>
            Vessels: <b className="text-text-secondary">{vesselsData?.length ?? 0}</b>
          </span>
        )}
        {hasErrors && (
          <span className="text-critical font-bold">
            FEED ERROR
          </span>
        )}
      </div>

      {/* Conflict Detail Overlay */}
      <ConflictDetailOverlay
        conflict={selectedConflictId ? c.find(x => x.id === selectedConflictId) ?? null : null}
        onClose={() => {
          onSelectConflict('');
          setFocusedConflict(null);
        }}
      />
    </div>
  );
}
