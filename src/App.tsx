import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useApiData } from './hooks/useApiData'
import { api } from './services/api'
import { useKioskMode } from './hooks/useKioskMode'
import ErrorBoundary from './components/ErrorBoundary'
import TopBar from './components/TopBar'
import TrendsBar from './components/TrendsBar'
import AIBrief from './components/AIBrief'
import RotatingPanels from './components/RotatingPanels'
import Ticker from './components/Ticker'

const WorldMap = lazy(() => import('./components/WorldMap'))
const CountryProfilePanel = lazy(() => import('./components/CountryProfilePanel'))
const TrumpNewsPopup = lazy(() => import('./components/TrumpNewsPopup'))
const CriticalMegaPopup = lazy(() => import('./components/CriticalMegaPopup'))
const Tier1AlertCard = lazy(() => import('./components/Tier1AlertCard'))

import type { Conflict, Alert } from './types'
import { MAP_VIEWS } from './types/tabs'
import type { TabId } from './types/tabs'

const CONFLICTS_INTERVAL = 3_600_000
const ALERTS_INTERVAL = 30_000

export default function App() {
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [kioskActive, setKioskActive] = useState(false)

  // Fixed global context — no rotation
  const contextId = 'global'

  const { data: conflicts, loading: conflictsLoading, error: conflictsError, lastUpdate: conflictsLastUpdate } =
    useApiData<Conflict[]>(api.conflicts, CONFLICTS_INTERVAL)

  const { data: alerts } = useApiData<Alert[]>(api.alerts, ALERTS_INTERVAL)

  // Kiosk mode
  useKioskMode(kioskActive)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('kiosk') === 'true') setKioskActive(true)
  }, [])

  const handleDismissAlert = useCallback((id: string) => {
    api.markAlertRead(id).catch(() => {})
  }, [])

  // Map view — always global
  const mapView = MAP_VIEWS.global

  return (
    <ErrorBoundary>
      {/* 4-row grid layout */}
      <div style={{
        display: 'grid',
        width: '100%',
        height: '100vh',
        gridTemplateRows: '56px 44px 1fr 42px',
        background: '#06080c',
      }}>
        {/* Row 1: StatusBar */}
        <TopBar
          contextId={contextId}
          contextIndex={0}
          progress={0}
          onContextClick={() => {}}
        />

        {/* Row 2: TrendsBar */}
        <TrendsBar />

        {/* Row 3: Main content — 65% map | 35% right column */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '65% 35%',
          overflow: 'hidden',
        }}>
          {/* Map */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRight: '1px solid rgba(255,200,50,0.12)' }}>
            <Suspense fallback={<div style={{ width: '100%', height: '100%', background: '#080c14' }} />}>
              <WorldMap
                selectedConflictId={null}
                onSelectConflict={() => {}}
                onCountryClick={setSelectedCountryCode}
                conflicts={conflicts}
                conflictsLoading={conflictsLoading}
                conflictsError={conflictsError}
                conflictsLastUpdate={conflictsLastUpdate}
                viewCenter={mapView.center}
                viewZoom={mapView.zoom}
                activeTab={contextId as TabId}
              />
            </Suspense>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* AI Brief — 42% */}
            <div style={{ flex: '0 0 42%', borderBottom: '1px solid rgba(255,200,50,0.12)', overflow: 'hidden' }}>
              <AIBrief focus={undefined} contextId={contextId} />
            </div>
            {/* Rotating Panels — 58% */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <RotatingPanels contextId={contextId} />
            </div>
          </div>
        </div>

        {/* Row 4: Ticker */}
        <Ticker />
      </div>

      {/* Overlays */}
      <Suspense fallback={null}>
        <CountryProfilePanel
          countryCode={selectedCountryCode}
          onClose={() => setSelectedCountryCode(null)}
          conflicts={conflicts ?? []}
        />
        <TrumpNewsPopup />
        <CriticalMegaPopup alerts={alerts ?? []} onDismiss={handleDismissAlert} />
        <Tier1AlertCard alerts={alerts ?? []} onDismiss={handleDismissAlert} />
      </Suspense>
    </ErrorBoundary>
  )
}
