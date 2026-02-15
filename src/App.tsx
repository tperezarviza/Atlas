import { useState, useCallback, useEffect, useMemo, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useApiData } from './hooks/useApiData'
import { api } from './services/api'
import { useContextRotation } from './hooks/useContextRotation'
import { useKioskMode } from './hooks/useKioskMode'
import ErrorBoundary from './components/ErrorBoundary'
import TopBar from './components/TopBar'
import Ticker from './components/Ticker'
import AlertBanner from './components/AlertBanner'
import TabPanel from './components/tabs/TabPanel'
import DashboardLayout from './components/layout/DashboardLayout'

const WorldMap = lazy(() => import('./components/WorldMap'))
const BootSequence = lazy(() => import('./components/BootSequence'))
const CountryProfilePanel = lazy(() => import('./components/CountryProfilePanel'))
const TrumpNewsPopup = lazy(() => import('./components/TrumpNewsPopup'))
const CriticalEventPopup = lazy(() => import('./components/CriticalEventPopup'))
import { getWidgetComponent, getWidgetProps } from './config/widgetComponents'
import type { WidgetContext } from './config/widgetComponents'
import { FIXED_LAYOUT } from './config/viewPresets'
import type { SlotId } from './config/widgetRegistry'

import type { Conflict, Alert } from './types'
import { MAP_VIEWS } from './types/tabs'
import type { TabId } from './types/tabs'

const CONFLICTS_INTERVAL = 3_600_000
const ALERTS_INTERVAL = 30_000

export default function App() {
  const [booted, setBooted] = useState(() => sessionStorage.getItem('atlas-booted') === '1')
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>('c1')
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
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

  const handleSelectConflict = useCallback((id: string) => {
    setSelectedConflictId(prev => (prev === id || id === '') ? null : id)
  }, [])

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id))
    api.markAlertRead(id).catch(() => {})
  }, [])

  // Map view based on context
  const mapView = MAP_VIEWS[context.id as TabId] ?? MAP_VIEWS.global

  // Widget context
  const widgetCtx: WidgetContext = useMemo(() => ({
    contextId: context.id,
    conflicts,
    conflictsLoading,
    conflictsError,
    conflictsLastUpdate,
    selectedConflictId,
    onSelectConflict: handleSelectConflict,
  }), [context.id, conflicts, conflictsLoading, conflictsError, conflictsLastUpdate, selectedConflictId, handleSelectConflict])

  // Fixed layout slot rendering
  function renderSlot(slotId: SlotId) {
    const widgetId = FIXED_LAYOUT.slots[slotId]
    if (!widgetId) return null
    const Widget = getWidgetComponent(widgetId)
    if (!Widget) return null
    const props = getWidgetProps(widgetId, widgetCtx)
    return <Widget {...props} />
  }

  if (!booted) {
    return (
      <Suspense fallback={<div className="h-screen w-screen" style={{ background: '#000' }} />}>
        <BootSequence onComplete={() => {
          sessionStorage.setItem('atlas-booted', '1')
          setBooted(true)
        }} />
      </Suspense>
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col" style={{ background: '#000000' }}>
        {/* Row 1: TopBar */}
        <div className="shrink-0" style={{ height: 48 }}>
          <TopBar
            contextId={context.id}
            contextIndex={contextIndex}
            progress={progress}
            onContextClick={goTo}
          />
        </div>

        {/* Resizable panel area */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DashboardLayout
            kioskActive={kioskActive}
            r2c1={
              <motion.div className="h-full" key={`r2c1-${context.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.02, duration: 0.15, ease: 'easeOut' }}>
                <TabPanel tabKey={`${context.id}-r2c1`}>
                  {renderSlot('r2c1')}
                </TabPanel>
              </motion.div>
            }
            map={
              <motion.div className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04, duration: 0.15, ease: 'easeOut' }}>
                <Suspense fallback={<div className="h-full w-full" style={{ background: '#0a0a0a' }} />}>
                  <WorldMap
                    selectedConflictId={selectedConflictId}
                    onSelectConflict={handleSelectConflict}
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
              </motion.div>
            }
            r2c3={
              <motion.div className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06, duration: 0.15, ease: 'easeOut' }}>
                {renderSlot('r2c3')}
              </motion.div>
            }
            r3c1={
              <motion.div className="h-full" key={`r3c1-${context.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.15, ease: 'easeOut' }}>
                <TabPanel tabKey={`${context.id}-r3c1`}>
                  {renderSlot('r3c1')}
                </TabPanel>
              </motion.div>
            }
            r3c2Left={
              <motion.div className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.10, duration: 0.15, ease: 'easeOut' }}>
                {renderSlot('r3c2-left')}
              </motion.div>
            }
            r3c2Right={
              <motion.div className="h-full" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.15, ease: 'easeOut' }}>
                {renderSlot('r3c2-right')}
              </motion.div>
            }
            r3c3={
              <motion.div className="h-full" key={`r3c3-${context.id}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.15, ease: 'easeOut' }}>
                <TabPanel tabKey={`${context.id}-r3c3`}>
                  {renderSlot('r3c3')}
                </TabPanel>
              </motion.div>
            }
          />
        </div>

        {/* Ticker */}
        <div className="shrink-0" style={{ height: 30 }}>
          <Ticker />
        </div>
      </div>

      {/* Alert banners */}
      <AlertBanner
        alerts={alerts ?? []}
        dismissedIds={dismissedAlerts}
        onDismiss={handleDismissAlert}
      />

      {/* Lazy-loaded overlays */}
      <Suspense fallback={null}>
        <CountryProfilePanel
          countryCode={selectedCountryCode}
          onClose={() => setSelectedCountryCode(null)}
          conflicts={conflicts ?? []}
        />
        <TrumpNewsPopup />
        <CriticalEventPopup />
      </Suspense>
    </ErrorBoundary>
  )
}
