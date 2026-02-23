import { useState, useEffect, useCallback, createContext, useContext } from 'react';

const AudioContext = createContext<boolean>(false);

export function useAudioEnabled() {
  return useContext(AudioContext);
}

// Singleton state for audio — persisted in localStorage
let globalAudioEnabled = localStorage.getItem('atlas-audio') === '1';
const listeners = new Set<(v: boolean) => void>();

function setGlobalAudio(v: boolean) {
  globalAudioEnabled = v;
  localStorage.setItem('atlas-audio', v ? '1' : '0');
  listeners.forEach(fn => fn(v));
}

export function useAudioState(): [boolean, () => void] {
  const [enabled, setEnabled] = useState(globalAudioEnabled);

  useEffect(() => {
    const handler = (v: boolean) => setEnabled(v);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  const toggle = useCallback(() => {
    setGlobalAudio(!globalAudioEnabled);
  }, []);

  return [enabled, toggle];
}

export function playAlertSound(type: 'critical' | 'trump') {
  if (!globalAudioEnabled) return;
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.value = 0.4;

    if (type === 'trump') {
      // 3 ascending tones — "breaking news" feel
      [440, 554, 659].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0.5, ctx.currentTime + i * 0.15);
        env.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.3);
        osc.connect(env).connect(gain);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.35);
      });
    } else {
      // 2 urgent alarm tones — critical alert feel
      [880, 660].forEach((freq, i) => {
        for (let r = 0; r < 2; r++) {
          const osc = ctx.createOscillator();
          const env = ctx.createGain();
          osc.type = 'square';
          osc.frequency.value = freq;
          const t = ctx.currentTime + (i * 2 + r) * 0.2;
          env.gain.setValueAtTime(0.3, t);
          env.gain.exponentialRampToValueAtTime(0.01, t + 0.18);
          osc.connect(env).connect(gain);
          osc.start(t);
          osc.stop(t + 0.2);
        }
      });
    }
    // Auto-close context after sounds finish
    setTimeout(() => ctx.close().catch(() => {}), 2000);
  } catch {
    // Web Audio not available
  }
}

export default function AudioToggle() {
  const [enabled, toggle] = useAudioState();

  return (
    <button
      onClick={toggle}
      title="Toggle audio alerts"
      style={{
        width: 36,
        height: 36,
        borderRadius: 6,
        border: '1px solid rgba(255,200,50,0.12)',
        background: 'transparent',
        color: enabled ? '#c9a84c' : '#7a6418',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 18,
        transition: 'background 0.15s, border-color 0.15s',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.target as HTMLButtonElement).style.background = 'rgba(255,200,50,0.08)';
        (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,200,50,0.22)';
      }}
      onMouseLeave={e => {
        (e.target as HTMLButtonElement).style.background = 'transparent';
        (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,200,50,0.12)';
      }}
    >
      {enabled ? '🔊' : '🔇'}
    </button>
  );
}
