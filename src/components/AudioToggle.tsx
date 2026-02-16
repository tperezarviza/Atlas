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
    const src = type === 'trump' ? '/sounds/alert-trump.mp3' : '/sounds/alert-critical.mp3';
    const audio = new Audio(src);
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch {
    // Audio playback not available
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
