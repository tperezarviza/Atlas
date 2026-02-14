import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useApiData } from './hooks/useApiData'
import { api } from './services/api'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useKioskMode } from './hooks/useKioskMode'
import { useLayoutConfig } from './hooks/useLayoutConfig'
import ErrorBoundary from './components/ErrorBoundary'
import BootSequence from './components/BootSequence'
import TopBar from './components/TopBar'
import WorldMap from './components/WorldMap'
import Ticker from './components/Ticker'
import AlertBanner from './components/AlertBanner'
import CountryProfilePanel from './components/CountryProfilePanel'
import TrumpNewsPopup from './components/TrumpNewsPopup'
import TabPanel from './components/tabs/TabPanel'
import DashboardLayout from './components/layout/DashboardLayout'
import { getWidgetComponent, getWidgetProps } from './config/widgetComponents'
import type { WidgetContext } from './config/widgetComponents'
import { VIEW_LAYOUT_PRESETS } from './config/viewPresets'
import type { SlotId } from './config/widgetRegistry'

import type { Conflict, Alert } from './types'
import type { ViewId } from './types/views'
import { KIOSK_CYCLE } from './types/views'
import { MAP_VIEWS } from './types/tabs'

const CONFLICTS_INTERVAL = 3_600_000 // 60 min
const ALERTS_INTERVAL = 30_000 // 30s
const KIOSK_ROTATE_MS = 300_000 // 5 min

export default function App() {
  const [booted, setBooted] = useState(() => sessionStorage.getItem('atlas-booted') === '1')
  const [selectedConflictId, setSelectedConflictId] = useState<string | null>('c1')
  const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [activeView, setActiveView] = useState<ViewId>('global')
  const [kioskActive, setKioskActive] = useState(false)

  const { data: conflicts, loading: conflictsLoading, error: conflictsError, lastUpdate: conflictsLastUpdate } =
    useApiData<Conflict[]>(api.conflicts, CONFLICTS_INTERVAL)

  const { data: alerts } = useApiData<Alert[]>(api.alerts, ALERTS_INTERVAL)

  const layoutConfig = useLayoutConfig()

  // Keyboard shortcuts (Ctrl+1..5)
  useKeyboardShortcuts(setActiveView)

  // Kiosk mode
  useKioskMode(kioskActive)

  // Handle conflict selection with toggle (deselect)
  const handleSelectConflict = useCallback((id: string) => {
    setSelectedConflictId(prev => (prev === id || id === '') ? null : id)
  }, [])

  // Kiosk mode — check URL param and auto-rotate
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('kiosk') === 'true') setKioskActive(true)
  }, [])

  const kioskRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    if (kioskActive) {
      kioskRef.current = setInterval(() => {
        setActiveView(prev => {
          const idx = KIOSK_CYCLE.indexOf(prev)
          return KIOSK_CYCLE[(idx + 1) % KIOSK_CYCLE.length]
        })
      }, KIOSK_ROTATE_MS)
    } else if (kioskRef.current) {
      clearInterval(kioskRef.current)
      kioskRef.current = null
    }
    return () => { if (kioskRef.current) clearInterval(kioskRef.current) }
  }, [kioskActive])

  const handleDismissAlert = useCallback((id: string) => {
    setDismissedAlerts(prev => new Set(prev).add(id))
    api.markAlertRead(id).catch(() => {})
  }, [])

  // Map view — always from MAP_VIEWS since ViewId = TabId
  const mapView = MAP_VIEWS[activeView]

  // ── Widget context for data-driven rendering ──
  const widgetCtx: WidgetContext = useMemo(() => ({
    activeView,
    conflicts,
    conflictsLoading,
    conflictsError,
    conflictsLastUpdate,
    selectedConflictId,
    onSelectConflict: handleSelectConflict,
  }), [activeView, conflicts, conflictsLoading, conflictsError, conflictsLastUpdate, selectedConflictId, handleSelectConflict])

  // ── Data-driven slot rendering ──
  const currentPreset = VIEW_LAYOUT_PRESETS[activeView]
  const customSlots = layoutConfig.getCustomSlots(activeView)

  function renderSlot(slotId: SlotId) {
    const widgetId = customSlots?.[slotId] ?? currentPreset.slots[slotId]
    if (!widgetId) return null
    const Widget = getWidgetComponent(widgetId)
    if (!Widget) return null
    const props = getWidgetProps(widgetId, widgetCtx)
    return <Widget {...props} />
  }

  if (!booted) {
    return (
      <BootSequence onComplete={() => {
        sessionStorage.setItem('atlas-booted', '1')
        setBooted(true)
      }} />
    )
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col" style={{ background: '#000000' }}>
        {/* Row 1: TopBar — fixed 48px */}
        <div className="shrink-0" style={{ height: 48 }}>
          <TopBar
            activeView={activeView}
            onViewChange={setActiveView}
          />
        </div>

        {/* Resizable panel area */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DashboardLayout
            kioskActive={kioskActive}
            r2c1={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r2c1`}>
                  {renderSlot('r2c1')}
                </TabPanel>
              </motion.div>
            }
            map={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
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
                  activeTab={activeView}
                />
              </motion.div>
            }
            r2c3={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r2c3`}>
                  {renderSlot('r2c3')}
                </TabPanel>
              </motion.div>
            }
            r3c1={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r3c1`}>
                  {renderSlot('r3c1')}
                </TabPanel>
              </motion.div>
            }
            r3c2Left={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r3c2-left`}>
                  {renderSlot('r3c2-left')}
                </TabPanel>
              </motion.div>
            }
            r3c2Right={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r3c2-right`}>
                  {renderSlot('r3c2-right')}
                </TabPanel>
              </motion.div>
            }
            r3c3={
              <motion.div className="h-full" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
                <TabPanel tabKey={`${activeView}-r3c3`}>
                  {renderSlot('r3c3')}
                </TabPanel>
              </motion.div>
            }
          />
        </div>

        {/* Ticker — fixed 36px */}
        <div className="shrink-0" style={{ height: 30 }}>
          <Ticker />
        </div>
      </div>

      {/* Alert banners — fixed position over grid */}
      <AlertBanner
        alerts={alerts ?? []}
        dismissedIds={dismissedAlerts}
        onDismiss={handleDismissAlert}
      />

      {/* Country Profile Panel — slide-in from right */}
      <CountryProfilePanel
        countryCode={selectedCountryCode}
        onClose={() => setSelectedCountryCode(null)}
        conflicts={conflicts ?? []}
      />

      {/* Trump News Flash Popup */}
      <TrumpNewsPopup />
    </ErrorBoundary>
  )
}
