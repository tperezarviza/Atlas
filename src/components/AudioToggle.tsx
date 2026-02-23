import { useState, useEffect, useCallback } from 'react';

// ── Audio state (module singleton, synced via listeners) ──
let globalAudioEnabled = localStorage.getItem('atlas-audio') === '1';
const listeners = new Set<(v: boolean) => void>();

function setGlobalAudio(v: boolean) {
  globalAudioEnabled = v;
  localStorage.setItem('atlas-audio', v ? '1' : '0');
  listeners.forEach(fn => fn(v));
}

// ── Web Audio Context ──
let _ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    console.log('[ATLAS Audio] Created AudioContext, state:', _ctx.state);
  } catch (e) {
    console.error('[ATLAS Audio] Failed to create AudioContext:', e);
    return null;
  }
  return _ctx;
}

// Resume on ANY user interaction (Chrome autoplay policy)
if (typeof document !== 'undefined') {
  const resume = () => {
    if (_ctx && _ctx.state === 'suspended') {
      _ctx.resume().then(() => console.log('[ATLAS Audio] Resumed via interaction'));
    }
  };
  document.addEventListener('click', resume);
  document.addEventListener('keydown', resume);
  document.addEventListener('touchstart', resume);
}

// ── Play confirmation beep ──
function playBeep(ctx: AudioContext) {
  console.log('[ATLAS Audio] playBeep, state:', ctx.state);
  try {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 520;
    g.gain.setValueAtTime(0.5, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.connect(g).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    console.log('[ATLAS Audio] Beep playing at t=', ctx.currentTime);
  } catch (e) {
    console.error('[ATLAS Audio] Beep error:', e);
  }
}

// ── Hook for audio state ──
export function useAudioState(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(globalAudioEnabled);

  useEffect(() => {
    listeners.add(setEnabled);
    return () => { listeners.delete(setEnabled); };
  }, []);

  const toggle = useCallback(() => {
    const next = !globalAudioEnabled;
    setGlobalAudio(next);
    console.log('[ATLAS Audio] toggle →', next);
    if (next) {
      // User gesture → create/resume AudioContext + beep
      const ctx = ensureCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          console.log('[ATLAS Audio] Resumed, now playing beep');
          playBeep(ctx);
        });
      } else {
        playBeep(ctx);
      }
    }
  }, []);

  return [enabled, toggle];
}

// ── Alert sounds (called from popup components) ──
export function playAlertSound(type: 'critical' | 'trump') {
  if (!globalAudioEnabled) {
    console.log('[ATLAS Audio] Sound skipped (audio disabled)');
    return;
  }
  const ctx = ensureCtx();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    console.warn('[ATLAS Audio] Context suspended, trying resume for', type);
    ctx.resume().then(() => _playSound(ctx, type));
    return;
  }
  _playSound(ctx, type);
}

function _playSound(ctx: AudioContext, type: 'critical' | 'trump') {
  console.log('[ATLAS Audio] Playing', type);
  try {
    const master = ctx.createGain();
    master.gain.value = 0.6;
    master.connect(ctx.destination);

    if (type === 'trump') {
      // 3 ascending tones — "breaking news"
      [440, 554, 659].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.18;
        env.gain.setValueAtTime(0.6, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
        osc.connect(env).connect(master);
        osc.start(t);
        osc.stop(t + 0.4);
      });
    } else {
      // 4 urgent alarm tones — critical alert
      [880, 660, 880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.22;
        env.gain.setValueAtTime(0.4, t);
        env.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
        osc.connect(env).connect(master);
        osc.start(t);
        osc.stop(t + 0.22);
      });
    }
  } catch (e) {
    console.error('[ATLAS Audio] Sound error:', e);
  }
}

// ── AudioToggle component (unused — TopBar uses useAudioState directly) ──
export default function AudioToggle() {
  const [enabled, toggle] = useAudioState();
  return (
    <button
      onClick={toggle}
      title="Toggle audio alerts"
      style={{
        width: 36, height: 36, borderRadius: 6,
        border: '1px solid rgba(255,200,50,0.12)',
        background: 'transparent',
        color: enabled ? '#c9a84c' : '#7a6418',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, flexShrink: 0,
      }}
    >
      {enabled ? '\u{1F50A}' : '\u{1F507}'}
    </button>
  );
}
