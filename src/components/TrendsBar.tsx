import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';

const REFRESH_MS = 30_000;

export default function TrendsBar() {
  const { data } = useApiData<{ keyword: string; count: number }[]>(api.twitterTrending, REFRESH_MS);

  const items = data ?? [];
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '0 24px',
      borderBottom: '1px solid rgba(255,200,50,0.12)',
      background: 'rgba(255,200,50,0.015)',
      overflow: 'hidden',
      height: '100%',
    }}>
      <div style={{
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 14,
        fontWeight: 700,
        color: '#ff8c00',
        letterSpacing: 2,
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>
        🔥 TRENDS
      </div>
      <div style={{ display: 'flex', gap: 10, overflow: 'hidden' }}>
        {sorted.map((item, i) => {
          const isHot = i < 2;
          return (
            <div
              key={item.keyword}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                whiteSpace: 'nowrap',
                fontFamily: "'IBM Plex Sans', sans-serif",
                fontSize: 15,
                fontWeight: 500,
                background: isHot ? 'rgba(255,140,0,0.12)' : 'rgba(255,200,50,0.06)',
                border: isHot ? '1px solid rgba(255,140,0,0.3)' : '1px solid rgba(255,200,50,0.12)',
                color: isHot ? '#ffd480' : '#ffffff',
              }}
            >
              {item.keyword}
              <span style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 13,
                color: '#c9a84c',
              }}>
                ×{item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
