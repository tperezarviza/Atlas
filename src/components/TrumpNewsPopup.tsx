import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

/** Build a fingerprint from the text content (not index-based IDs) */
function fingerprint(text: string): string {
  return text.slice(0, 80).toLowerCase().replace(/\s+/g, ' ').trim()
}

export default function TrumpNewsPopup() {
  const [post, setPost] = useState<TrumpPost | null>(null)
  const [visible, setVisible] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [testMode, setTestMode] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track seen posts by text fingerprint (stable, not index-based)
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
    setVisible(true)

    dismissTimerRef.current = setTimeout(() => {
      setVisible(false)
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
    setVisible(false)
  }, [clearTimers])

  // Poll for new Trump posts
  useEffect(() => {
    async function checkForTrumpPosts() {
      try {
        const tweets = await api.twitterIntel('trump')
        const trumpTweets: TrumpPost[] = tweets
          .filter((t: TwitterIntelItem) =>
            t.author.username.toLowerCase() === 'realdonaldtrump' ||
            t.author.username.toLowerCase() === 'potus' ||
            t.author.username.toLowerCase() === 'whitehouse'
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

        // Mark all current posts as seen on first load (no popup)
        if (initialLoadRef.current) {
          initialLoadRef.current = false
          for (const p of allPosts) seenFingerprintsRef.current.add(fingerprint(p.text))
          return
        }

        // Find the first truly new post (by text content, not unstable IDs)
        const newest = allPosts.find(p => !seenFingerprintsRef.current.has(fingerprint(p.text)))
        if (!newest) return

        // Mark ALL current posts as seen
        for (const p of allPosts) seenFingerprintsRef.current.add(fingerprint(p.text))

        // Show only the single newest post
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

  // Test button: show latest Trump post from API
  const handleTest = useCallback(async () => {
    try {
      const tweets = await api.twitterIntel('trump')
      const trump = tweets.find((t: TwitterIntelItem) =>
        (t.author.username.toLowerCase() === 'realdonaldtrump' ||
         t.author.username.toLowerCase() === 'potus') &&
        hasValidText(t.text)
      )
      if (trump) {
        showPost({
          id: `test-${Date.now()}`,
          text: trump.text,
          source: 'X / Twitter',
          handle: `@${trump.author.username}`,
          time: trump.created_at,
        })
        return
      }

      const feeds = await api.leaders()
      const truth = feeds.find((f: FeedItem) => f.category === 'trump' && hasValidText(f.text))
      if (truth) {
        showPost({
          id: `test-${Date.now()}`,
          text: truth.text,
          source: 'Truth Social',
          handle: truth.handle,
          time: truth.time,
        })
      }
    } catch (err) {
      console.error('[TRUMP-TEST]', err)
    }
  }, [showPost])

  // ESC to dismiss
  useEffect(() => {
    if (!visible) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [visible, dismiss])

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), [clearTimers])

  const pages = post ? splitPages(post.text) : []
  const multiPage = pages.length > 1

  return (
    <>
      {/* Dev test button */}
      <button
        onClick={() => setTestMode(prev => !prev)}
        style={{
          position: 'fixed', bottom: 8, right: 8, zIndex: 10001,
          width: 28, height: 28, borderRadius: '50%',
          background: testMode ? '#b91c1c' : '#1e293b',
          border: '1px solid #334155', color: testMode ? '#fff' : '#64748b',
          fontSize: 12, cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
        title="Toggle Trump News test button"
      >
        T
      </button>
      {testMode && (
        <button
          onClick={handleTest}
          style={{
            position: 'fixed', bottom: 8, right: 44, zIndex: 10001,
            padding: '4px 12px', borderRadius: 3,
            background: '#b91c1c', border: '1px solid #d4af37',
            color: '#d4af37', fontSize: 10, fontWeight: 700,
            letterSpacing: 1, cursor: 'pointer', fontFamily: 'inherit',
            textTransform: 'uppercase',
          }}
        >
          Test Trump News (API)
        </button>
      )}

      <AnimatePresence>
        {visible && post && (
          <>
            <motion.div
              className="fixed inset-0"
              style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 9998 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={dismiss}
            />

            <motion.div
              className="fixed"
              style={{
                top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(920px, 94vw)',
                background: '#0a0a0a',
                border: '2px solid #b91c1c',
                borderRadius: 8,
                overflow: 'hidden',
                zIndex: 9999,
                boxShadow: '0 0 80px rgba(185,28,28,0.25), 0 0 160px rgba(185,28,28,0.08), inset 0 1px 0 rgba(212,175,55,0.15)',
              }}
              initial={{ opacity: 0, scale: 0.88, y: '-50%', x: '-50%' }}
              animate={{ opacity: 1, scale: 1, y: '-50%', x: '-50%' }}
              exit={{ opacity: 0, scale: 0.92, y: '-50%', x: '-50%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
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
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{post.handle}</div>
                      <div style={{ fontSize: 10, color: '#64748b' }}>
                        via <span style={{ color: '#b91c1c', fontWeight: 600 }}>{post.source}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 140 }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={currentPage}
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30 }}
                        transition={{ duration: 0.4 }}
                        className="tn-text-content"
                      >
                        {pages[currentPage]}
                      </motion.div>
                    </AnimatePresence>
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
                            background: i === currentPage ? '#d4af37' : '#334155',
                            boxShadow: i === currentPage ? '0 0 8px rgba(212,175,55,0.5)' : 'none',
                            transition: 'all 0.3s',
                          }}
                        />
                      ))}
                      <span style={{ fontSize: 9, color: '#475569', marginLeft: 6 }}>{currentPage + 1}/{pages.length}</span>
                    </div>
                  )}

                  {post.mediaUrl && (
                    <div style={{ marginTop: 12, borderRadius: 4, overflow: 'hidden', border: '1px solid #1e293b', maxHeight: 200 }}>
                      <img src={post.mediaUrl} alt="" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}
                </div>
              </div>

              <div className="tn-footer">
                <div className="tn-countdown" key={post.id} />
                <div style={{ display: 'flex', gap: 16, fontSize: 10, color: '#475569', letterSpacing: 0.5, textTransform: 'uppercase' as const }}>
                  <span>Auto-dismiss 30s</span>
                  <span>ESC to close</span>
                </div>
                <button className="tn-dismiss" onClick={dismiss}>Dismiss</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
