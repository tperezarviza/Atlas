import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../services/api'
import type { Alert } from '../types'

const POLL_INTERVAL = 30_000
const DISMISS_MS = 45_000

type EventType = 'military' | 'earthquake' | 'natural' | 'generic'

interface EventDisplay {
  type: EventType
  icon: string
  label: string
  borderColor: string
  headerGradient: string
  flashBg: string
  flashColor: string
  dotColor: string
  glowColor: string
}

const EVENT_STYLES: Record<EventType, Omit<EventDisplay, 'type' | 'icon' | 'label'>> = {
  military: {
    borderColor: '#ff3b3b',
    headerGradient: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)',
    flashBg: '#ff3b3b', flashColor: '#fff', dotColor: '#7f1d1d',
    glowColor: 'rgba(255,59,59,0.25)',
  },
  earthquake: {
    borderColor: '#ff8c00',
    headerGradient: 'linear-gradient(90deg, #7c2d12 0%, #9a3412 50%, #c2410c 100%)',
    flashBg: '#ff8c00', flashColor: '#1a0a00', dotColor: '#7c2d12',
    glowColor: 'rgba(255,140,0,0.25)',
  },
  natural: {
    borderColor: '#ffc832',
    headerGradient: 'linear-gradient(90deg, #713f12 0%, #854d0e 50%, #a16207 100%)',
    flashBg: '#ffc832', flashColor: '#1a0a00', dotColor: '#713f12',
    glowColor: 'rgba(255,200,50,0.2)',
  },
  generic: {
    borderColor: '#ff3b3b',
    headerGradient: 'linear-gradient(90deg, #7f1d1d 0%, #991b1b 50%, #dc2626 100%)',
    flashBg: '#ff3b3b', flashColor: '#fff', dotColor: '#7f1d1d',
    glowColor: 'rgba(255,59,59,0.25)',
  },
}

function classifyAlert(alert: Alert): EventDisplay {
  const title = alert.title.toLowerCase()
  const source = alert.source

  if (source === 'usgs') {
    const isTsunami = title.includes('tsunami')
    return {
      type: 'earthquake',
      icon: isTsunami ? '🌊' : '🌋',
      label: isTsunami ? 'TSUNAMI' : 'EARTHQUAKE',
      ...EVENT_STYLES.earthquake,
    }
  }

  if (source === 'eonet') {
    const icon = title.includes('typhoon') || title.includes('storm') || title.includes('hurricane') ? '🌀'
      : title.includes('volcano') || title.includes('eruption') ? '🌋'
      : title.includes('wildfire') || title.includes('fire') ? '🔥'
      : title.includes('flood') ? '🌊'
      : '⚠️'
    return { type: 'natural', icon, label: 'NATURAL EVENT', ...EVENT_STYLES.natural }
  }

  const icon = title.includes('missile') || title.includes('strike') ? '🚀'
    : title.includes('explosion') || title.includes('bomb') ? '💥'
    : title.includes('nuclear') ? '☢️'
    : title.includes('coup') || title.includes('invasion') ? '⚔️'
    : title.includes('shooting') || title.includes('attack') ? '💥'
    : '🔴'
  const label = source === 'twitter' ? 'X / INTEL'
    : source === 'rss' ? 'RSS / INTEL'
    : 'MILITARY'
  return { type: 'military', icon, label, ...EVENT_STYLES.military }
}

function formatUtcTime(): string {
  const now = new Date()
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()} \u2022 ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')} UTC`
}

export default function CriticalEventPopup() {
  const [alert, setAlert] = useState<Alert | null>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null }
  }, [])

  const showAlert = useCallback((a: Alert) => {
    clearTimers()
    setAlert(a)
    setVisible(true)
    requestAnimationFrame(() => setMounted(true))
    dismissTimerRef.current = setTimeout(() => {
      setMounted(false)
      setTimeout(() => setVisible(false), 180)
    }, DISMISS_MS)
  }, [clearTimers])

  const dismiss = useCallback(() => {
    clearTimers()
    setMounted(false)
    setTimeout(() => setVisible(false), 180)
    if (alert) api.markAlertRead(alert.id).catch(() => {})
  }, [clearTimers, alert])

  useEffect(() => {
    async function check() {
      try {
        const alerts = await api.alerts()
        const critical = alerts.filter(a =>
          (a.priority === 'flash' || a.priority === 'urgent') &&
          !a.read &&
          a.source !== 'executive_orders'
        )

        if (initialLoadRef.current) {
          initialLoadRef.current = false
          for (const a of critical) seenIdsRef.current.add(a.id)
          return
        }

        const newest = critical.find(a => !seenIdsRef.current.has(a.id))
        if (!newest) return

        for (const a of critical) seenIdsRef.current.add(a.id)
        showAlert(newest)
      } catch { /* silent */ }
    }

    check()
    const interval = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAlert])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, dismiss])

  useEffect(() => () => clearTimers(), [clearTimers])

  if (!alert) return null
  const ev = classifyAlert(alert)

  return (
    <>
      {visible && (
        <>
          {/* Backdrop — NO blur */}
          <div
            onClick={dismiss}
            style={{
              position: 'fixed', inset: 0, zIndex: 9996,
              background: 'rgba(0,0,0,0.85)',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.18s ease-out',
            }}
          />

          {/* Popup — pure CSS */}
          <div
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              width: 'min(820px, 94vw)', background: '#0a0a0a',
              border: `2px solid ${ev.borderColor}`, borderRadius: 8,
              overflow: 'hidden', zIndex: 9997,
              boxShadow: `0 0 60px ${ev.glowColor}`,
              opacity: mounted ? 1 : 0,
              transform: mounted
                ? 'translate(-50%, -50%) scale(1)'
                : 'translate(-50%, -50%) scale(0.92)',
              transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
              willChange: 'transform, opacity',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 18px', background: ev.headerGradient,
              borderBottom: `1px solid ${ev.borderColor}`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: ev.flashBg, color: ev.flashColor,
                fontSize: 10, fontWeight: 800, letterSpacing: 2,
                padding: '3px 10px', borderRadius: 2, textTransform: 'uppercase' as const,
              }}>
                <div style={{
                  width: 6, height: 6, background: ev.dotColor,
                  borderRadius: '50%', animation: 'tn-blink 0.8s step-end infinite',
                }} />
                {alert.priority === 'flash' ? 'FLASH' : 'URGENT'}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 3, color: '#fff', textTransform: 'uppercase' as const }}>
                ATLAS <span style={{ color: ev.borderColor }}>ALERT</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.5, fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatUtcTime()}
                </span>
                <button onClick={dismiss} className="tn-close">&times;</button>
              </div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', minHeight: 200 }}>
              <div style={{
                flexShrink: 0, width: 160, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12,
                borderRight: '1px solid rgba(255,255,255,0.05)',
                background: ev.type === 'earthquake' ? 'linear-gradient(180deg, #0f0f0f, #1a0f00)'
                  : ev.type === 'natural' ? 'linear-gradient(180deg, #0f0f0f, #0f0f00)'
                  : 'linear-gradient(180deg, #0f0f0f, #1a0505)',
              }}>
                <div style={{ fontSize: 56, lineHeight: 1 }}>{ev.icon}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700,
                  letterSpacing: 2, padding: '3px 12px', borderRadius: 2, textTransform: 'uppercase' as const,
                  background: `${ev.borderColor}22`, color: ev.borderColor,
                  border: `1px solid ${ev.borderColor}44`,
                }}>
                  {alert.priority.toUpperCase()}
                </div>
                <div style={{
                  fontSize: 8, letterSpacing: 3, textTransform: 'uppercase' as const,
                  fontWeight: 700, color: ev.borderColor,
                }}>
                  {ev.label}
                </div>
              </div>

              <div style={{ flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 10, lineHeight: 1.3 }}>
                  {alert.title}
                </div>
                {alert.detail && (
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>
                    {alert.detail}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, marginTop: 'auto', paddingTop: 12, flexWrap: 'wrap' as const }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                    letterSpacing: 1, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' as const,
                    background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {alert.source.toUpperCase()}
                  </span>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 600,
                    letterSpacing: 1, padding: '2px 8px', borderRadius: 2, textTransform: 'uppercase' as const,
                    background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)',
                  }}>
                    {alert.priority.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="tn-footer">
              <div className="tn-countdown" key={alert.id} style={{ animation: 'tn-countdown 45s linear forwards' }} />
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                <span>Auto-dismiss 45s</span>
                <span>ESC to close</span>
              </div>
              <button className="tn-dismiss" onClick={dismiss}>Dismiss</button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
