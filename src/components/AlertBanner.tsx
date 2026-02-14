import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Alert } from '../types';

function timeAgo(ts: string): string {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PRIORITY_STYLES: Record<string, { bg: string; border: string; badge: string }> = {
  flash: {
    bg: 'rgba(255,59,59,0.12)',
    border: '#ff3b3b',
    badge: 'bg-critical text-white',
  },
  urgent: {
    bg: 'rgba(255,140,0,0.12)',
    border: '#ff8c00',
    badge: 'bg-high text-white',
  },
};

interface AlertBannerProps {
  alerts: Alert[];
  dismissedIds: Set<string>;
  onDismiss: (id: string) => void;
}

const AUTO_DISMISS_MS = 30_000;

export default function AlertBanner({ alerts, dismissedIds, onDismiss }: AlertBannerProps) {
  const visible = alerts
    .filter(a => (a.priority === 'flash' || a.priority === 'urgent') && !a.read && !dismissedIds.has(a.id))
    .slice(0, 3);

  return (
    <div className="fixed top-[50px] left-0 right-0 z-[950] flex flex-col gap-[2px] pointer-events-none">
      <AnimatePresence>
        {visible.map(alert => (
          <BannerItem key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function BannerItem({ alert, onDismiss }: { alert: Alert; onDismiss: (id: string) => void }) {
  const style = PRIORITY_STYLES[alert.priority] ?? PRIORITY_STYLES.urgent;
  const [, setTick] = useState(0);

  // Auto-dismiss after 30s
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(alert.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  // Update relative time every 30s
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="pointer-events-auto mx-4"
      style={{
        background: style.bg,
        borderLeft: `3px solid ${style.border}`,
        borderRadius: 3,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="flex items-center gap-3 px-4 py-2">
        {/* Pulsing dot */}
        <span
          className="w-[6px] h-[6px] rounded-full shrink-0"
          style={{ background: style.border, animation: 'pulse-dot 1.5s infinite' }}
        />

        {/* Priority badge */}
        <span className={`font-data text-[8px] font-bold uppercase px-[5px] py-[1px] rounded-[2px] shrink-0 ${style.badge}`}>
          {alert.priority}
        </span>

        {/* Title */}
        <span className="font-data text-[11px] text-text-primary flex-1 truncate">
          {alert.title}
        </span>

        {/* Time */}
        <span className="font-data text-[9px] text-text-muted shrink-0">
          {timeAgo(alert.timestamp)}
        </span>

        {/* Dismiss */}
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-text-muted hover:text-text-primary text-[14px] leading-none cursor-pointer shrink-0 ml-1"
        >
          ✕
        </button>
      </div>
    </motion.div>
  );
}
