interface DataBadgeProps {
  data: unknown;
  error: Error | null;
  loading?: boolean;
  lastUpdate?: Date | null;
  intervalMs?: number;
  liveLabel?: string;
  mockLabel?: string;
}

const styles = {
  error: { background: 'rgba(255,59,59,.1)', color: '#ff3b3b', border: '1px solid rgba(255,59,59,.2)' },
  stale: { background: 'rgba(255,140,0,.1)', color: '#ff8c00', border: '1px solid rgba(255,140,0,.2)' },
  live: { background: 'rgba(0,255,136,.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,.2)' },
  purple: { background: 'rgba(168,85,247,.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,.2)' },
  loading: { background: 'rgba(255,200,50,.1)', color: '#ffc832', border: '1px solid rgba(255,200,50,.2)' },
} as const;

const base = 'font-data text-[9px] px-[6px] py-[1px] rounded-[5px] tracking-[0.5px]';

export default function DataBadge({
  data,
  error,
  loading,
  lastUpdate,
  intervalMs,
  liveLabel = 'LIVE',
  mockLabel = 'MOCK',
}: DataBadgeProps) {
  // Loading state (no data yet, no error)
  if (loading && !data && !error) {
    return <div className={base} style={styles.loading}>LOADING</div>;
  }

  // Error with no fallback data
  if (error && !data) {
    return <div className={base} style={styles.error}>ERROR</div>;
  }

  // Data exists with error = stale (refetch failed, serving cached)
  if (data && error) {
    return <div className={base} style={styles.stale}>STALE</div>;
  }

  // Staleness check based on lastUpdate and intervalMs
  if (data && lastUpdate && intervalMs) {
    const age = Date.now() - lastUpdate.getTime();
    if (age > intervalMs * 2) {
      return <div className={base} style={styles.stale}>STALE</div>;
    }
    return <div className={base} style={styles.live}>{liveLabel}</div>;
  }

  // Data from live API (no staleness info available)
  if (data) {
    return <div className={base} style={styles.live}>{liveLabel}</div>;
  }

  // No data, no error, not loading — using mock/fallback data
  return <div className={base} style={styles.purple}>{mockLabel}</div>;
}

export function PurpleBadge({ label }: { label: string }) {
  return <div className={base} style={styles.purple}>{label}</div>;
}
