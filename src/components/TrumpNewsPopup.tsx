import { useState, useEffect, useRef, useCallback } from 'react'
import { playAlertSound } from './AudioToggle'
import { api } from '../services/api'
import type { TwitterIntelItem, FeedItem } from '../types'

const POLL_INTERVAL = 30_000
const DISMISS_MS = 30_000
const PAGE_ROTATE_MS = 10_000
const CHARS_PER_PAGE = 320

interface TrumpPost {
  id: string
  text: string
  source: 'Truth Social' | 'X / Twitter'
  handle: string
  time: string
  mediaUrl?: string
}

function hasValidText(text: string): boolean {
  if (!text || text.length < 5) return false
  if (/^\[No Title\]/i.test(text)) return false
  if (/^Post from /i.test(text)) return false
  return true
}

function splitPages(text: string): string[] {
  if (text.length <= CHARS_PER_PAGE) return [text]
  const pages: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= CHARS_PER_PAGE) {
      pages.push(remaining)
      break
    }
    const cut = remaining.lastIndexOf(' ', CHARS_PER_PAGE)
    const splitAt = cut > CHARS_PER_PAGE * 0.5 ? cut : CHARS_PER_PAGE
    pages.push(remaining.slice(0, splitAt).trimEnd() + ' \u2026')
    remaining = '\u2026 ' + remaining.slice(splitAt).trimStart()
  }
  return pages
}

function formatUtcTime(): string {
  const now = new Date()
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${now.getUTCDate()} ${months[now.getUTCMonth()]} ${now.getUTCFullYear()} \u2022 ${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')} UTC`
}

function fingerprint(text: string): string {
  return text.slice(0, 80).toLowerCase().replace(/\s+/g, ' ').trim()
}

export default function TrumpNewsPopup() {
  const [post, setPost] = useState<TrumpPost | null>(null)
  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [screenFlash, setScreenFlash] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const seenFingerprintsRef = useRef<Set<string>>(new Set())
  const initialLoadRef = useRef(true)

  const clearTimers = useCallback(() => {
    if (dismissTimerRef.current) { clearTimeout(dismissTimerRef.current); dismissTimerRef.current = null }
    if (pageTimerRef.current) { clearInterval(pageTimerRef.current); pageTimerRef.current = null }
  }, [])

  const showPost = useCallback((p: TrumpPost) => {
    clearTimers()
    setPost(p)
    setCurrentPage(0)
    playAlertSound('trump')

    // Trigger screen flash
    setScreenFlash(true)
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
    flashTimerRef.current = setTimeout(() => setScreenFlash(false), 600)

    setVisible(true)
    // Force a frame at opacity 0, then animate in
    requestAnimationFrame(() => setMounted(true))

    dismissTimerRef.current = setTimeout(() => {
      setMounted(false)
      setTimeout(() => setVisible(false), 180)
    }, DISMISS_MS)

    const pages = splitPages(p.text)
    if (pages.length > 1) {
      pageTimerRef.current = setInterval(() => {
        setCurrentPage(prev => (prev + 1) % pages.length)
      }, PAGE_ROTATE_MS)
    }
  }, [clearTimers])

  const dismiss = useCallback(() => {
    clearTimers()
    setMounted(false)
    setTimeout(() => setVisible(false), 180)
  }, [clearTimers])

  useEffect(() => {
    async function checkForTrumpPosts() {
      try {
        const tweets = await api.twitterIntel('trump')
        const trumpTweets: TrumpPost[] = tweets
          .filter((t: TwitterIntelItem) =>
            t.author.username.toLowerCase() === 'realdonaldtrump' ||
            t.author.username.toLowerCase() === 'potus'
          )
          .filter((t: TwitterIntelItem) => hasValidText(t.text))
          .map((t: TwitterIntelItem) => ({
            id: `tw-${t.id}`,
            text: t.text,
            source: 'X / Twitter' as const,
            handle: `@${t.author.username}`,
            time: t.created_at,
          }))

        const feeds = await api.leaders()
        const truthPosts: TrumpPost[] = feeds
          .filter((f: FeedItem) => f.category === 'trump')
          .filter((f: FeedItem) => hasValidText(f.text))
          .map((f: FeedItem) => ({
            id: `ts-${f.id}`,
            text: f.text,
            source: 'Truth Social' as const,
            handle: f.handle,
            time: f.time,
          }))

        const allPosts = [...trumpTweets, ...truthPosts]

        if (initialLoadRef.current) {
          initialLoadRef.current = false
          for (const p of allPosts) seenFingerprintsRef.current.add(fingerprint(p.text))
          return
        }

        const newest = allPosts.find(p => !seenFingerprintsRef.current.has(fingerprint(p.text)))
        if (!newest) return

        for (const p of allPosts) seenFingerprintsRef.current.add(fingerprint(p.text))
        showPost(newest)
      } catch {
        // Silent fail
      }
    }

    checkForTrumpPosts()
    const interval = setInterval(checkForTrumpPosts, POLL_INTERVAL)
    return () => clearInterval(interval)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPost])

  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, dismiss])

  useEffect(() => () => {
    clearTimers()
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current)
  }, [clearTimers])

  const pages = post ? splitPages(post.text) : []
  const multiPage = pages.length > 1

  return (
    <>
      {/* Screen flash — red overlay on trigger */}
      <div className={`screen-flash${screenFlash ? ' active' : ''}`} />

      {visible && post && (
        <>
          {/* Backdrop — red-tinted dark overlay, NO blur */}
          <div
            onClick={dismiss}
            style={{
              position: 'fixed', inset: 0, zIndex: 9998,
              background: 'rgba(40,0,0,0.75)',
              opacity: mounted ? 1 : 0,
              transition: 'opacity 0.18s ease-out',
            }}
          />

          {/* Popup — pure CSS transform animation with glow */}
          <div
            style={{
              position: 'fixed',
              top: '50%', left: '50%',
              width: '44%',
              maxWidth: 860,
              minWidth: 600,
              background: '#0c0a08',
              border: '2px solid #d4af37',
              borderRadius: 12,
              overflow: 'hidden',
              zIndex: 9999,
              opacity: mounted ? 1 : 0,
              transform: mounted
                ? 'translate(-50%, -50%) scale(1)'
                : 'translate(-50%, -50%) scale(0.92)',
              transition: 'opacity 0.18s ease-out, transform 0.18s ease-out',
              willChange: 'transform, opacity',
              animation: mounted ? 'popup-glow 2s ease-in-out infinite alternate' : 'none',
            }}
          >
            <div className="tn-header">
              <div className="tn-flash">
                <div className="tn-flash-dot" />
                BREAKING
              </div>
              <div className="tn-brand">TRUMP <span className="tn-brand-gold">NEWS</span></div>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="tn-time">{formatUtcTime()}</span>
                <button className="tn-close" onClick={dismiss}>&times;</button>
              </div>
            </div>

            <div style={{ display: 'flex', minHeight: 260 }}>
              <div className="tn-mugshot">
                <div className="mugshot-frame">
                  <img src="/mugshot.jpg" alt="Trump" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                  <div className="mugshot-label-main">TRUMP NEWS</div>
                  <div className="mugshot-label-sub">ATLAS INTEL</div>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div className="tn-avatar">DT</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#ffe082' }}>{post.handle}</div>
                    <div style={{ fontSize: 10, color: '#7a6418' }}>
                      via <span style={{ color: '#b91c1c', fontWeight: 600 }}>{post.source}</span>
                    </div>
                  </div>
                </div>

                {/* Page content — pure CSS crossfade */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 140 }}>
                  <div className="tn-text-content">
                    {pages[currentPage]}
                  </div>
                </div>

                {multiPage && (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, alignItems: 'center' }}>
                    {pages.map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: i === currentPage ? 20 : 8,
                          height: 8,
                          borderRadius: 4,
                          background: i === currentPage ? '#ffc832' : 'rgba(255,200,50,0.15)',
                          transition: 'width 0.2s, background 0.2s',
                        }}
                      />
                    ))}
                    <span style={{ fontSize: 9, color: '#50400e', marginLeft: 6 }}>{currentPage + 1}/{pages.length}</span>
                  </div>
                )}

                {post.mediaUrl && (
                  <div style={{ marginTop: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid rgba(255,200,50,0.10)', maxHeight: 200 }}>
                    <img src={post.mediaUrl} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
              </div>
            </div>

            <div className="tn-footer">
              <div className="tn-countdown" key={post.id} />
              <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#50400e', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                <span>Auto-dismiss 30s</span>
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
