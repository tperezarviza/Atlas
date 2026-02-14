import { useRef, useEffect, useMemo } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import type { MilitaryFlight, UkraineFrontData } from '../../types';
import MaybeFadeIn from '../MaybeFadeIn';
import DataBadge from '../DataBadge';
import Skeleton from '../Skeleton';

const FLIGHTS_REFRESH_MS = 120_000; // 2 min
const FRONT_REFRESH_MS = 600_000; // 10 min
const MAX_FLIGHTS_SHOWN = 8;

const NUCLEAR_LEVELS = [
  { label: 'LOW', color: '#00ff88' },
  { label: 'MODERATE', color: '#d4a72c' },
  { label: 'ELEVATED', color: '#ff8c00' },
  { label: 'IMMINENT', color: '#ff3b3b' },
] as const;

export default function RussianMilitaryActivity() {
  const {
    data: flights,
    loading: flightsLoading,
    error: flightsError,
    lastUpdate: flightsLastUpdate,
  } = useApiData<MilitaryFlight[]>(() => api.militaryFlights('europe_ukraine'), FLIGHTS_REFRESH_MS);

  const {
    data: frontData,
    loading: frontLoading,
    error: frontError,
  } = useApiData<UkraineFrontData>(api.ukraineFront, FRONT_REFRESH_MS);

  const hasShownData = useRef(false);
  useEffect(() => { if (flights || frontData) hasShownData.current = true; }, [flights, frontData]);

  const loading = flightsLoading && frontLoading;

  // Group ACLED events by location, sorted by count descending
  const locationCounts = useMemo(() => {
    if (!frontData?.recent_events?.length) return [];
    const counts: Record<string, number> = {};
    for (const evt of frontData.recent_events) {
      const loc = evt.location || 'Unknown';
      counts[loc] = (counts[loc] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [frontData]);

  const maxLocationCount = locationCounts.length > 0 ? locationCounts[0][1] : 1;

  const displayFlights = flights?.slice(0, MAX_FLIGHTS_SHOWN) ?? [];

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          ✈️ Russian Military Activity
        </div>
        <DataBadge
          data={flights}
          error={flightsError}
          loading={flightsLoading}
          lastUpdate={flightsLastUpdate}
          intervalMs={FLIGHTS_REFRESH_MS}
          liveLabel="LIVE"
          mockLabel="MOCK"
        />
      </div>

      {/* Error message */}
      {flightsError && !flights && frontError && !frontData && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load military activity data. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !flights && !frontData ? (
        <Skeleton lines={6} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {/* Military Flights Section */}
            <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
              <div className="px-3 py-[6px]">
                <div className="flex items-center justify-between mb-[6px]">
                  <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase">
                    🛩️ Military Flights — Europe / Ukraine
                  </div>
                  <span className="font-data text-[10px] font-semibold text-accent">
                    {flights ? flights.length : '—'} tracked
                  </span>
                </div>
                {displayFlights.length > 0 ? (
                  <div className="flex flex-col gap-[3px]">
                    {displayFlights.map((f) => (
                      <div
                        key={f.icao24}
                        className="flex items-center justify-between px-[6px] py-[4px] rounded-[2px]"
                        style={{ background: 'rgba(255,255,255,.02)' }}
                      >
                        <div className="flex items-center gap-[8px]">
                          <span className="font-data text-[11px] font-semibold text-text-primary">
                            {f.callsign?.trim() || f.icao24}
                          </span>
                          <span className="font-data text-[9px] text-text-muted">
                            {f.aircraft_type || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex items-center gap-[8px]">
                          <span className="font-data text-[9px] text-text-secondary">
                            FL{Math.round(f.altitude_m / 100)}
                          </span>
                          <span className="font-data text-[9px] text-text-muted">
                            {f.origin_country}
                          </span>
                        </div>
                      </div>
                    ))}
                    {flights && flights.length > MAX_FLIGHTS_SHOWN && (
                      <div className="font-data text-[9px] text-text-muted text-center py-[2px]">
                        +{flights.length - MAX_FLIGHTS_SHOWN} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="font-data text-[10px] text-text-muted py-2 text-center">
                    No flights currently tracked
                  </div>
                )}
              </div>
            </div>

            {/* ACLED Events by Location */}
            <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
              <div className="px-3 py-[6px]">
                <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[6px]">
                  📍 ACLED Events by Location
                </div>
                {locationCounts.length > 0 ? (
                  <div className="flex flex-col gap-[5px]">
                    {locationCounts.map(([location, count]) => {
                      const pct = (count / maxLocationCount) * 100;
                      return (
                        <div key={location}>
                          <div className="flex items-center justify-between mb-[2px]">
                            <span className="font-data text-[10px] text-text-secondary truncate mr-2">
                              {location}
                            </span>
                            <span className="font-data text-[10px] font-semibold text-critical shrink-0">
                              {count}
                            </span>
                          </div>
                          <div
                            className="h-[4px] rounded-[1px]"
                            style={{ background: 'rgba(255,255,255,.04)' }}
                          >
                            <div
                              className="h-full rounded-[1px] transition-[width] duration-500"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #ff3b3b, #ff8c00)',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="font-data text-[10px] text-text-muted py-2 text-center">
                    No location data available
                  </div>
                )}
              </div>
            </div>

            {/* Nuclear Rhetoric Gauge */}
            <div className="px-3 py-[6px]">
              <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[6px]">
                ☢️ Nuclear Rhetoric Gauge
              </div>
              <div className="flex items-center justify-between mb-[6px]">
                <span className="font-data text-[10px] text-text-muted">Current Level:</span>
                <span
                  className="font-data text-[12px] font-bold tracking-[1px]"
                  style={{ color: 'rgba(255,255,255,.25)' }}
                >
                  —
                </span>
              </div>
              {/* Gauge bar */}
              <div className="flex gap-[2px] mb-[6px]">
                {NUCLEAR_LEVELS.map((level) => (
                  <div
                    key={level.label}
                    className="flex-1 flex flex-col items-center gap-[3px]"
                  >
                    <div
                      className="w-full h-[6px] rounded-[1px]"
                      style={{
                        background: 'rgba(255,255,255,.06)',
                        opacity: 0.4,
                      }}
                    />
                    <span
                      className="font-data text-[7px] tracking-[0.5px] uppercase"
                      style={{ color: 'rgba(255,255,255,.25)' }}
                    >
                      {level.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="font-data text-[9px] text-text-muted leading-[1.4]" style={{ opacity: 0.7 }}>
                No real-time data source available
              </div>
            </div>
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
}
