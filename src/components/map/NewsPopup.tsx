import { useState, useEffect, useRef } from 'react';

// Module-level cache to avoid re-fetching
const contextCache = new Map<string, string>();

interface Props {
  headline: string;
  category: string;
  lat: number;
  lng: number;
}

export default function NewsPopup({ headline, category, lat, lng }: Props) {
  const [context, setContext] = useState<string | null>(contextCache.get(headline) ?? null);
  const [loading, setLoading] = useState(!contextCache.has(headline));
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (contextCache.has(headline)) {
      setContext(contextCache.get(headline)!);
      setLoading(false);
      return;
    }

    abortRef.current = new AbortController();
    setLoading(true);
    setError(false);

    const params = new URLSearchParams({ headline, category, lat: String(lat), lng: String(lng) });

    fetch(`/api/why-it-matters?${params}`, { signal: abortRef.current.signal })
      .then(r => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((data: { context: string }) => {
        contextCache.set(headline, data.context);
        setContext(data.context);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(true);
          setLoading(false);
        }
      });

    return () => abortRef.current?.abort();
  }, [headline, category, lat, lng]);

  return (
    <div style={{ marginTop: 6, borderTop: '1px solid rgba(255,200,50,0.10)', paddingTop: 4, minWidth: 180 }}>
      {loading && (
        <div style={{ color: '#7a6418', fontStyle: 'italic', fontSize: 11 }}>
          &#9889; Analyzing...
        </div>
      )}
      {error && (
        <div style={{ color: '#7a6418', fontStyle: 'italic', fontSize: 11 }}>
          Analysis unavailable
        </div>
      )}
      {context && (
        <div style={{ color: '#c8a020', fontStyle: 'italic', fontSize: 11, lineHeight: 1.4 }}>
          &#9889; {context}
        </div>
      )}
    </div>
  );
}
