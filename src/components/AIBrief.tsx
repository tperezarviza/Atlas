import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import DOMPurify from 'dompurify';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { BriefResponse } from '../services/api';

const REFRESH_MS = 14_400_000; // 4 hours

const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'b', 'strong', 'em', 'i', 'br', 'span'];
const ALLOWED_ATTR = ['class'];

function sanitizeBriefHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

interface AIBriefProps {
  focus?: string;
}

const FOCUS_LABELS: Record<string, string> = {
  mideast: 'MIDEAST',
  ukraine: 'UKRAINE',
  domestic: 'DOMESTIC',
  intel: 'INTEL',
};

// Extracted inline style constants (avoid object recreation on every render)
const PANEL_STYLE = { background: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,200,50,0.10)' };
const HEADER_STYLE = { borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' };
const CONTENT_PAD = { padding: '10px 18px' };
const CONTENT_PAD_FULL = { padding: '10px 18px 14px 18px' };
const REGEN_BTN_STYLE = { border: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,.08)', color: '#ffc832' };
const BADGE_ERROR = { background: 'rgba(255,59,59,.1)', color: '#ff3b3b', border: '1px solid rgba(255,59,59,.2)' };
const BADGE_STALE = { background: 'rgba(255,140,0,.1)', color: '#ff8c00', border: '1px solid rgba(255,140,0,.2)' };
const BADGE_AI = { background: 'rgba(168,85,247,.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,.2)' };

export default function AIBrief({ focus }: AIBriefProps) {
  const fetchBrief = useMemo(() => () => api.brief(focus), [focus]);
  const { data, error, refetch } = useApiData<BriefResponse>(fetchBrief, REFRESH_MS);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Refetch when focus changes
  useEffect(() => {
    refetch();
  }, [focus, refetch]);

  const brief = data;

  const handleRegenerate = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRegenerating(true);
    setRegenError(null);
    try {
      const result = await api.regenBrief(focus);
      if (controller.signal.aborted) return;
      if ('error' in result) {
        setRegenError(String((result as { error: string }).error));
        return;
      }
      await refetch(controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      setRegenError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      if (!controller.signal.aborted) setRegenerating(false);
    }
  }, [focus, refetch]);

  const sanitizedHtml = brief ? sanitizeBriefHTML(brief.html) : '';

  const headerLabel = focus && FOCUS_LABELS[focus]
    ? `🤖 AI Brief: ${FOCUS_LABELS[focus]}`
    : '🤖 AI Intelligence Brief';

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={PANEL_STYLE}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={HEADER_STYLE}
      >
        <div className="font-title text-[14px] font-semibold tracking-[2px] uppercase text-text-secondary">
          {headerLabel}
        </div>
        <StatusBadge brief={brief} error={error} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && !brief ? (
          <div style={CONTENT_PAD} className="text-[14px] text-critical">
            Failed to load brief. Retrying...
          </div>
        ) : brief ? (
          <div
            className="text-[14px] leading-[1.65] brief-content"
            style={{ ...CONTENT_PAD_FULL, animation: 'fade-in 0.4s ease-out' }}
            key={brief.generatedAt}
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        ) : (
          <div style={CONTENT_PAD} className="text-[14px] text-text-muted">Loading brief...</div>
        )}

        {/* Regen footer */}
        <div className="flex flex-col gap-1 mb-2 pt-2" style={{ borderTop: '1px solid rgba(255,200,50,0.10)', margin: '0 18px 8px 18px' }}>
          {regenError && (
            <div className="font-data text-[12px] text-critical">{regenError}</div>
          )}
          <div className="flex items-center gap-[6px]">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="font-data text-[12px] px-[10px] py-[3px] rounded-[2px] tracking-[0.5px] cursor-pointer disabled:opacity-50"
              style={REGEN_BTN_STYLE}
            >
              {regenerating ? '⏳ Generating...' : '🔄 Regenerate Brief'}
            </button>
            <span className="font-data text-[12px] text-text-muted ml-auto">
              {brief
                ? `Generated: ${brief.generatedAt?.slice(0, 16) ?? '—'} UTC · Model: ${brief.model} · Sources: ${brief.sources?.join(', ') ?? '—'}`
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ brief, error }: { brief: BriefResponse | null; error: Error | null }) {
  if (error && !brief) {
    return (
      <div
        className="font-data text-[12px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
        style={BADGE_ERROR}
      >
        ERROR
      </div>
    );
  }
  if (brief && error) {
    return (
      <div
        className="font-data text-[12px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
        style={BADGE_STALE}
      >
        STALE
      </div>
    );
  }
  const label = brief?.model === 'mock' ? 'MOCK' : 'ATLAS AI';
  return (
    <div
      className="font-data text-[12px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
      style={BADGE_AI}
    >
      {label}
    </div>
  );
}
