import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { useApiData } from './hooks/useApiData'
import { api } from './services/api'
import { useContextRotation } from './hooks/useContextRotation'
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

  const { context, contextIndex, progress, goTo } = useContextRotation(true)

  const { data: conflicts, loading: conflictsLoading, error: conflictsError, lastUpdate: conflictsLastUpdate } =
    useApiData<Conflict[]>(api.conflicts, CONFLICTS_INTERVAL)

  const { data: alerts } = useApiData<Alert[]>(api.alerts, ALERTS_INTERVAL)

  // Keyboard shortcuts: Ctrl+1..5 jumps context
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 5) {
        e.preventDefault()
        goTo(num - 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goTo])

  // Kiosk mode
  useKioskMode(kioskActive)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('kiosk') === 'true') setKioskActive(true)
  }, [])

  const handleDismissAlert = useCallback((id: string) => {
    api.markAlertRead(id).catch(() => {})
  }, [])

  // Map view based on context
  const mapView = MAP_VIEWS[context.id as TabId] ?? MAP_VIEWS.global

  // Brief focus based on context
  const briefFocus = context.briefFocus

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
          contextId={context.id}
          contextIndex={contextIndex}
          progress={progress}
          onContextClick={goTo}
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
                activeTab={context.id as TabId}
              />
            </Suspense>
          </div>

          {/* Right column */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* AI Brief — 42% */}
            <div style={{ flex: '0 0 42%', borderBottom: '1px solid rgba(255,200,50,0.12)', overflow: 'hidden' }}>
              <AIBrief focus={briefFocus} contextId={context.id} />
            </div>
            {/* Rotating Panels — 58% */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <RotatingPanels contextId={context.id} />
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
