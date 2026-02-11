import { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { api } from '../services/api';
import type { BriefResponse } from '../services/api';

const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'b', 'strong', 'em', 'i', 'br', 'span'];
const ALLOWED_ATTR = ['class'];

function sanitizeBriefHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });
}

export default function AIBrief() {
  const { data, error, refresh } = useAutoRefresh<BriefResponse>(api.brief, 240_000);
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const brief = data;

  async function handleRegenerate() {
    // Abort any in-flight regeneration
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setRegenerating(true);
    setRegenError(null);
    try {
      const result = await api.regenBrief();
      if (controller.signal.aborted) return;
      if ('error' in result) {
        setRegenError(String((result as { error: string }).error));
        return;
      }
      await refresh(controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      setRegenError(err instanceof Error ? err.message : 'Regeneration failed');
    } finally {
      if (!controller.signal.aborted) setRegenerating(false);
    }
  }

  return (
    <div className="h-full flex flex-col rounded-[3px] overflow-hidden" style={{ background: '#0b1224', border: '1px solid #14233f' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid #14233f', background: 'rgba(255,255,255,.01)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🤖 AI Intelligence Brief
        </div>
        <StatusBadge brief={brief} error={error} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error && !brief ? (
          <div className="px-3 py-[10px] text-[12px] text-critical">
            Failed to load brief: {error.message}
          </div>
        ) : brief ? (
          <div
            className="px-3 py-[10px] text-[12px] leading-[1.55] brief-content"
            dangerouslySetInnerHTML={{ __html: sanitizeBriefHTML(brief.html) }}
          />
        ) : (
          <div className="px-3 py-[10px] text-[12px] text-text-muted">Loading brief...</div>
        )}

        {/* Regen footer */}
        <div className="flex flex-col gap-1 mx-3 mb-2 pt-2" style={{ borderTop: '1px solid #14233f' }}>
          {regenError && (
            <div className="font-data text-[9px] text-critical">{regenError}</div>
          )}
          <div className="flex items-center gap-[6px]">
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="font-data text-[9px] px-[10px] py-[3px] rounded-[2px] tracking-[0.5px] cursor-pointer disabled:opacity-50"
              style={{
                border: '1px solid #14233f',
                background: 'rgba(45,122,237,.08)',
                color: '#2d7aed',
              }}
            >
              {regenerating ? '⏳ Generating...' : '🔄 Regenerate Brief'}
            </button>
            <span className="font-data text-[8px] text-text-muted ml-auto">
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
        className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
        style={{ background: 'rgba(232,59,59,.1)', color: '#e83b3b', border: '1px solid rgba(232,59,59,.2)' }}
      >
        ERROR
      </div>
    );
  }
  if (brief && error) {
    return (
      <div
        className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
        style={{ background: 'rgba(212,167,44,.1)', color: '#d4a72c', border: '1px solid rgba(212,167,44,.2)' }}
      >
        STALE
      </div>
    );
  }
  const label = brief?.model === 'mock' ? 'MOCK' : 'ATLAS AI';
  return (
    <div
      className="font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]"
      style={{ background: 'rgba(155,89,232,.1)', color: '#9b59e8', border: '1px solid rgba(155,89,232,.2)' }}
    >
      {label}
    </div>
  );
}
