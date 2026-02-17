import { useState, useEffect, useRef, useCallback } from 'react'
import type { Alert } from '../types'

const DISMISS_MS = 30_000
const MEGA_RE = /bombing|bombed|airstrike|air.strike|invasion|coup\s+d|nuclear.test|war.declared|capitol.seized|missile.launch|chemical.attack|massacre/i

interface Props {
  alerts: Alert[]
  onDismiss: (id: string) => void
}

interface EventDisplay {
  icon: string
  label: string
}

function classifyEvent(alert: Alert): EventDisplay {
  const title = alert.title.toLowerCase()
  const source = alert.source

  if (source === 'usgs') return { icon: '\ud83c\udf0d', label: 'EARTHQUAKE' }
  if (source === 'eonet') return { icon: '\ud83c\udf00', label: 'NATURAL EVENT' }
  if (/missile|strike|bomb|attack|airstrike/i.test(title)) return { icon: '\ud83d\udca5', label: 'MILITARY STRIKE' }
  if (/coup|overthrow|seize/i.test(title)) return { icon: '\u26a1', label: "COUP D'\u00c9TAT" }
  if (/nuclear/i.test(title)) return { icon: '\u2622\ufe0f', label: 'NUCLEAR EVENT' }
  return { icon: '\u26a0\ufe0f', label: 'CRITICAL EVENT' }
}

function formatUtcTime(): string {
  const now = new Date()
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()} \u2022 ${String(now.getUTCHours()).padStart(2,'0')}:${String(now.getUTCMinutes()).padStart(2,'0')} UTC`
}

function isMegaEvent(alert: Alert): boolean {
  const text = `${alert.title} ${alert.detail || ''}`
  return MEGA_RE.test(text)
}

export default function CriticalMegaPopup({ alerts, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [screenFlash, setScreenFlash] = useState(false)
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownIdsRef = useRef<Set<string>>(new Set())

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null }
    if (flashTimerRef.current) { clearTimeout(flashTimerRef.current); flashTimerRef.current = null }
  }, [])

  const dismiss = useCallback(() => {
    clearTimers()
    setVisible(false)
    const id = activeAlert?.id
    setTimeout(() => {
      setMounted(false)
      setActiveAlert(null)
      if (id) onDismiss(id)
    }, 300)
  }, [clearTimers, activeAlert, onDismiss])

  const showAlert = useCallback((alert: Alert) => {
    clearTimers()
    shownIdsRef.current.add(alert.id)
    setActiveAlert(alert)
    setMounted(true)
    setScreenFlash(true)
    flashTimerRef.current = setTimeout(() => setScreenFlash(false), 600)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    dismissTimerRef.current = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        setMounted(false)
        setActiveAlert(null)
        onDismiss(alert.id)
      }, 300)
    }, DISMISS_MS)
  }, [clearTimers, onDismiss])

  // Find first unread flash alert matching mega keywords
  useEffect(() => {
    if (activeAlert) return // one at a time
    const mega = alerts.find(a =>
      a.priority === 'flash' &&
      !a.read &&
      !shownIdsRef.current.has(a.id) &&
      isMegaEvent(a)
    )
    if (mega) showAlert(mega)
  }, [alerts, activeAlert, showAlert])

  // ESC to dismiss
  useEffect(() => {
    if (!mounted) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [mounted, dismiss])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  if (!mounted || !activeAlert) return null

  const ev = classifyEvent(activeAlert)
  const sourceTags = activeAlert.source.split(/[,_\s]+/).filter(Boolean)

  return (
    <>
      {/* Red screen flash */}
      {screenFlash && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(255, 0, 0, 0.3)',
          pointerEvents: 'none',
          animation: 'cp-screen-flash 0.6s ease-out forwards',
        }} />
      )}

      {/* Overlay */}
      <div
        onClick={dismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(50,0,0,0.7)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease-out',
        }}
      />

      {/* Popup */}
      <div
        style={{
          position: 'fixed',
          top: '50%', left: '50%',
          width: '44%',
          maxWidth: 860,
          minWidth: 600,
          background: '#0c0608',
          border: '2px solid #ff3b3b',
          borderRadius: 12,
          overflow: 'hidden',
          zIndex: 9999,
          animation: 'critical-glow 1.5s ease-in-out infinite alternate',
          opacity: visible ? 1 : 0,
          transform: visible
            ? 'translate(-50%, -50%) scale(1)'
            : 'translate(-50%, -50%) scale(0.92)',
          transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
          willChange: 'transform, opacity',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 20px',
          background: 'linear-gradient(135deg, #4a0000, #7f1d1d, #991b1b)',
          borderBottom: '1px solid #ff3b3b',
        }}>
          {/* Warning icon with pulse */}
          <span style={{
            fontSize: 36, lineHeight: 1,
            animation: 'cp-icon-pulse 1.2s ease-in-out infinite',
          }}>
            {'\u26a0\ufe0f'}
          </span>

          {/* Flash badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#ff3b3b', color: '#fff',
            fontSize: 10, fontWeight: 800, letterSpacing: 2,
            padding: '3px 10px', borderRadius: 2,
            textTransform: 'uppercase',
          }}>
            <div style={{
              width: 6, height: 6, background: '#7f0000',
              borderRadius: '50%', animation: 'tn-blink 0.8s step-end infinite',
            }} />
            CRITICAL
          </div>

          {/* Title */}
          <div style={{
            fontSize: 24,
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            color: '#fff',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {ev.label}
          </div>

          {/* Time */}
          <div style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{
              fontSize: 14,
              fontFamily: "'IBM Plex Mono', monospace",
              color: 'rgba(255,255,255,0.5)',
            }}>
              {formatUtcTime()}
            </span>
            <button onClick={dismiss} className="tn-close">&times;</button>
          </div>
        </div>

        {/* Body */}
        <div style={{
          padding: 24, display: 'flex', gap: 24,
        }}>
          {/* Left column */}
          <div style={{
            width: 120, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div style={{
              fontSize: 64, lineHeight: 1,
              animation: 'cp-icon-pulse 1.2s ease-in-out infinite',
            }}>
              {ev.icon}
            </div>
            <div style={{
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 700,
              letterSpacing: 2,
              color: '#ff3b3b',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              {ev.label}
            </div>
          </div>

          {/* Right column */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Headline */}
            <div style={{
              fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.3,
            }}>
              {activeAlert.title}
            </div>

            {/* Description */}
            {activeAlert.detail && (
              <div style={{
                fontSize: 18, lineHeight: 1.5,
                color: 'rgba(255,255,255,0.85)',
              }}>
                {activeAlert.detail}
              </div>
            )}

            {/* Source tags */}
            <div style={{
              display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto', paddingTop: 8,
            }}>
              {sourceTags.map(tag => (
                <span key={tag} style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 10, fontWeight: 600,
                  letterSpacing: 1, padding: '2px 8px', borderRadius: 2,
                  textTransform: 'uppercase',
                  background: 'rgba(255,59,59,0.1)',
                  color: '#ff3b3b',
                  border: '1px solid rgba(255,59,59,0.25)',
                }}>
                  {tag.toUpperCase()}
                </span>
              ))}
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10, fontWeight: 600,
                letterSpacing: 1, padding: '2px 8px', borderRadius: 2,
                textTransform: 'uppercase',
                background: 'rgba(255,59,59,0.1)',
                color: '#ff3b3b',
                border: '1px solid rgba(255,59,59,0.25)',
              }}>
                {activeAlert.priority.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer with countdown bar */}
        <div className="tn-footer" style={{ borderTop: '1px solid rgba(255,59,59,0.2)' }}>
          <div
            key={activeAlert.id}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: '#ff3b3b',
              transformOrigin: 'left',
              animation: 'tn-countdown 30s linear forwards',
              willChange: 'transform',
            }}
          />
          <div style={{
            display: 'flex', gap: 16, fontSize: 10,
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: 0.5, textTransform: 'uppercase',
          }}>
            <span>Auto-dismiss 30s</span>
            <span>ESC to close</span>
          </div>
          <button className="tn-dismiss" onClick={dismiss} style={{
            color: '#ff3b3b', borderColor: 'rgba(255,59,59,0.3)',
          }}>
            Dismiss
          </button>
        </div>
      </div>

      {/* Inline keyframes for screen flash and icon pulse */}
      <style>{`
        @keyframes cp-screen-flash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cp-icon-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>
    </>
  )
}
