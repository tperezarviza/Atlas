import { useMemo } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { GoogleTrendsData } from '../services/api';

const REFRESH_MS = 30_000;
const TRENDS_REFRESH_MS = 120_000;

export default function TrendsBar() {
  const { data: twitterTrends } = useApiData<{ keyword: string; count: number }[]>(api.twitterTrending, REFRESH_MS);
  const { data: googleTrends } = useApiData<GoogleTrendsData>(api.googleTrends, TRENDS_REFRESH_MS);

  const merged = useMemo(() => {
    const items: { keyword: string; count: number; source: 'twitter' | 'google' }[] = [];

    if (twitterTrends) {
      for (const t of twitterTrends) {
        items.push({ keyword: t.keyword, count: t.count, source: 'twitter' });
      }
    }

    if (googleTrends?.geoTerms) {
      for (const g of googleTrends.geoTerms.filter(t => t.isGeopolitical).slice(0, 10)) {
        if (!items.some(i => i.keyword.toLowerCase() === g.term.toLowerCase())) {
          items.push({ keyword: g.term, count: g.maxScore, source: 'google' });
        }
      }
    }

    return items.sort((a, b) => b.count - a.count);
  }, [twitterTrends, googleTrends]);

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
        {merged.map((item, i) => {
          const isHot = i < 2;
          const isGoogle = item.source === 'google';
          return (
            <div
              key={`${item.source}-${item.keyword}`}
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
                color: isGoogle ? '#a855f7' : '#c9a84c',
              }}>
                {isGoogle ? `G` : `×${item.count}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
