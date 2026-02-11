interface DataBadgeProps {
  data: unknown;
  error: Error | null;
  liveLabel?: string;
  mockLabel?: string;
}

const styles = {
  error: { background: 'rgba(232,59,59,.1)', color: '#e83b3b', border: '1px solid rgba(232,59,59,.2)' },
  stale: { background: 'rgba(212,167,44,.1)', color: '#d4a72c', border: '1px solid rgba(212,167,44,.2)' },
  live: { background: 'rgba(40,179,90,.1)', color: '#28b35a', border: '1px solid rgba(40,179,90,.2)' },
  purple: { background: 'rgba(155,89,232,.1)', color: '#9b59e8', border: '1px solid rgba(155,89,232,.2)' },
} as const;

const base = 'font-data text-[9px] px-[6px] py-[1px] rounded-[2px] tracking-[0.5px]';

export default function DataBadge({ data, error, liveLabel = 'LIVE', mockLabel = 'MOCK' }: DataBadgeProps) {
  if (error && !data) {
    return <div className={base} style={styles.error}>ERROR</div>;
  }
  if (data && error) {
    return <div className={base} style={styles.stale}>STALE</div>;
  }
  const label = data ? liveLabel : mockLabel;
  const style = data ? styles.live : styles.live;
  return <div className={base} style={style}>{label}</div>;
}

export function PurpleBadge({ label }: { label: string }) {
  return <div className={base} style={styles.purple}>{label}</div>;
}
