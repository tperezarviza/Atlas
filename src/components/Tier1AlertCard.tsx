import { useState, useEffect, useRef, useCallback } from 'react'
import type { Alert } from '../types'

const DISMISS_MS = 20_000
const MEGA_RE = /bomb|strike|invasion|coup|nuclear.test|war.declared|capitol.seized/i

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

function isMegaEvent(alert: Alert): boolean {
  const text = `${alert.title} ${alert.detail || ''}`
  return MEGA_RE.test(text)
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'JUST NOW'
  if (mins < 60) return `${mins}m AGO`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h AGO`
  return `${Math.floor(hrs / 24)}d AGO`
}

export default function Tier1AlertCard({ alerts, onDismiss }: Props) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)
  const [activeAlert, setActiveAlert] = useState<Alert | null>(null)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownIdsRef = useRef<Set<string>>(new Set())

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null }
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

  // Find first unread flash/urgent alert that is NOT a mega event
  useEffect(() => {
    if (activeAlert) return // one at a time
    const tier1 = alerts.find(a =>
      (a.priority === 'flash' || a.priority === 'urgent') &&
      !a.read &&
      !shownIdsRef.current.has(a.id) &&
      !isMegaEvent(a)
    )
    if (tier1) showAlert(tier1)
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
      {/* Card - no overlay, doesn't block dashboard */}
      <div style={{
        position: 'fixed',
        bottom: 60,
        left: '50%',
        transform: visible
          ? 'translateX(-50%) translateY(0)'
          : 'translateX(-50%) translateY(20px)',
        width: 'min(580px, 90vw)',
        background: 'rgba(10,12,16,0.97)',
        border: '1px solid rgba(255,59,59,0.15)',
        borderRadius: 10,
        boxShadow: '0 0 30px rgba(255,59,59,0.08), 0 4px 24px rgba(0,0,0,0.5)',
        zIndex: 9000,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease-out, transform 0.3s ease-out',
        willChange: 'transform, opacity',
        overflow: 'hidden',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px 0 16px',
        }}>
          {/* Icon */}
          <span style={{ fontSize: 22, lineHeight: 1 }}>{ev.icon}</span>

          {/* Event type */}
          <span style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 16, fontWeight: 700,
            color: '#ff3b3b',
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}>
            {ev.label}
          </span>

          {/* Sources */}
          <div style={{ display: 'flex', gap: 4 }}>
            {sourceTags.map(tag => (
              <span key={tag} style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, fontWeight: 600,
                letterSpacing: 0.5,
                color: '#7a6418',
              }}>
                {tag.toUpperCase()}
              </span>
            ))}
          </div>

          {/* Time - right aligned */}
          <span style={{
            marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13,
            color: '#7a6418',
          }}>
            {formatRelativeTime(activeAlert.timestamp)}
          </span>
        </div>

        {/* Body */}
        <div style={{ padding: '10px 16px 14px 16px' }}>
          <div style={{
            fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.4,
          }}>
            {activeAlert.title}
            {activeAlert.detail && (
              <span style={{ color: 'rgba(255,255,255,0.7)' }}> &mdash; {activeAlert.detail}</span>
            )}
          </div>
        </div>

        {/* Tags row */}
        <div style={{
          display: 'flex', gap: 6, flexWrap: 'wrap',
          padding: '0 16px 12px 16px',
        }}>
          {/* Outline tag - priority */}
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10, fontWeight: 600,
            letterSpacing: 1, padding: '2px 8px', borderRadius: 2,
            textTransform: 'uppercase',
            background: 'transparent',
            color: '#ff3b3b',
            border: '1px solid #ff3b3b',
          }}>
            {activeAlert.priority.toUpperCase()}
          </span>

          {/* Filled tags - sources */}
          {sourceTags.map(tag => (
            <span key={tag} style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 10, fontWeight: 600,
              letterSpacing: 1, padding: '2px 8px', borderRadius: 2,
              textTransform: 'uppercase',
              background: '#ff3b3b',
              color: '#fff',
            }}>
              {tag.toUpperCase()}
            </span>
          ))}
        </div>

        {/* Countdown bar */}
        <div style={{ position: 'relative', height: 3 }}>
          <div
            key={activeAlert.id}
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              height: 3,
              background: '#ff3b3b',
              transformOrigin: 'left',
              animation: 't1-countdown 20s linear forwards',
              willChange: 'transform',
            }}
          />
        </div>

        {/* Red bottom accent line */}
        <div style={{
          height: 3,
          background: 'linear-gradient(90deg, #ff3b3b, #ff8c00, #ff3b3b)',
        }} />
      </div>

      {/* Inline keyframes */}
      <style>{`
        @keyframes t1-countdown {
          0% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
      `}</style>
    </>
  )
}
