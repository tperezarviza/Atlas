import { useEffect, useRef, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { BriefResponse } from '../services/api';

const REFRESH_MS = 14_400_000;
const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'b', 'strong', 'em', 'i', 'br', 'span'];
const ALLOWED_ATTR = ['class'];

function sanitizeBriefHTML(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR, ALLOW_DATA_ATTR: false });
}

function parseBriefContent(html: string): { bluf: string; bullets: string[] } {
  const div = document.createElement('div');
  div.innerHTML = html;
  const paragraphs: string[] = [];
  div.querySelectorAll('p, li').forEach(el => {
    const text = el.textContent?.trim();
    if (text && text.length > 10) paragraphs.push(text);
  });
  if (paragraphs.length === 0) {
    const text = div.textContent?.trim() ?? '';
    return { bluf: text, bullets: [] };
  }
  return { bluf: paragraphs[0], bullets: paragraphs.slice(1) };
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

const CONTEXT_LABELS: Record<string, string> = {
  global: 'GLOBAL', mideast: 'MIDEAST', ukraine: 'UKRAINE', domestic: 'DOMESTIC', intel: 'INTEL',
};

interface AIBriefProps {
  focus?: string;
  contextId?: string;
}

export default function AIBrief({ focus, contextId }: AIBriefProps) {
  const fetchBrief = useMemo(() => () => api.brief(focus), [focus]);
  const { data: brief, error, refetch } = useApiData<BriefResponse>(fetchBrief, REFRESH_MS);
  const briefRef = useRef<HTMLDivElement>(null);

  useEffect(() => { refetch(); }, [focus, refetch]);

  // Auto-scroll past BLUF after 15s
  useEffect(() => {
    const el = briefRef.current;
    if (!el || !brief) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      intervalId = setInterval(() => {
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
          el.scrollTop = 0;
        } else {
          el.scrollTop += 1;
        }
      }, 100);
    }, 15000);
    return () => {
      clearTimeout(timeout);
      if (intervalId) clearInterval(intervalId);
    };
  }, [brief]);

  const sanitizedHtml = brief ? sanitizeBriefHTML(brief.html) : '';
  const { bluf, bullets } = useMemo(() => sanitizedHtml ? parseBriefContent(sanitizedHtml) : { bluf: '', bullets: [] }, [sanitizedHtml]);
  const contextLabel = CONTEXT_LABELS[contextId ?? 'global'] ?? 'GLOBAL';
  const updatedAgo = brief?.generatedAt ? timeAgo(brief.generatedAt) : '—';
  const confidence = brief?.confidence ?? 0;
  const confColor = confidence >= 70 ? '#00ff88' : confidence >= 40 ? '#ff8c00' : '#ff3b3b';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '14px 20px 10px', flexShrink: 0,
        borderBottom: '1px solid rgba(255,200,50,0.12)',
        background: 'rgba(255,200,50,0.03)',
      }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#ffffff', letterSpacing: 2 }}>
          AI BRIEF
        </div>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, fontWeight: 600,
          padding: '2px 8px', borderRadius: 4, letterSpacing: 1,
          background: 'rgba(255,200,50,0.1)', color: '#c9a84c',
          border: '1px solid rgba(255,200,50,0.12)',
        }}>
          {contextLabel}
        </div>
        <div style={{ marginLeft: 'auto', fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#7a6418' }}>
          Updated {updatedAgo}
        </div>
      </div>

      {/* Body */}
      <div ref={briefRef} style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>
        {error && !brief ? (
          <div style={{ fontSize: 16, color: '#ff3b3b' }}>Failed to load brief...</div>
        ) : bluf ? (
          <>
            <div style={{
              fontSize: 19, fontWeight: 600, lineHeight: 1.45,
              color: '#ffffff', marginBottom: 14, paddingBottom: 14,
              borderBottom: '1px solid rgba(255,200,50,0.12)',
            }}>
              {bluf}
            </div>
            {bullets.map((bullet, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 10,
                fontSize: 17, lineHeight: 1.4, color: 'rgba(255,255,255,0.88)',
              }}>
                <span style={{ flexShrink: 0, width: 4, height: 4, borderRadius: '50%', background: '#c9a84c', marginTop: 10 }} />
                <span>{bullet}</span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: 16, color: '#7a6418' }}>Loading brief...</div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 20px', flexShrink: 0,
        borderTop: '1px solid rgba(255,200,50,0.12)',
        background: 'rgba(255,200,50,0.03)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: '#7a6418' }}>Confidence</span>
          <div style={{ width: 100, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 3, background: confColor, width: `${confidence}%` }} />
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: confColor }}>{confidence}%</span>
        </div>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, color: '#7a6418' }}>
          {brief?.generatedAt ? new Date(brief.generatedAt).toUTCString().replace(/:\d{2} GMT/, ' UTC') : '—'}
        </div>
      </div>
    </div>
  );
}
