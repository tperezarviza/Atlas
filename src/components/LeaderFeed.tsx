import { memo, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import MaybeFadeIn from './MaybeFadeIn';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';
import type { FeedItem, TwitterIntelItem } from '../types';

const REFRESH_MS = 120_000; // 2 min

const borderColors: Record<string, string> = {
  trump: '#ff3b3b',
  musk: '#a855f7',
  military: '#ff8c00',
  leader: '#ffc832',
  twitter: '#1d9bf0',
};

function tweetToFeedItem(t: TwitterIntelItem): FeedItem {
  return {
    id: `tw-${t.id}`,
    flag: '🐦',
    handle: `@${t.author.username}`,
    role: `${t.author.name} · ${t.author.followers_count.toLocaleString()} followers`,
    source: 'X/Twitter',
    time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    category: t.category === 'trump' ? 'trump' : t.category === 'military' ? 'military' : 'leader',
    text: t.text,
    engagement: `♻️ ${t.metrics.retweet_count.toLocaleString()} · ❤️ ${t.metrics.like_count.toLocaleString()} · 👁 ${t.metrics.impression_count.toLocaleString()}`,
    tags: [t.priority.toUpperCase(), t.category.toUpperCase()],
  };
}

interface LeaderFeedProps {
  filter?: (item: FeedItem) => boolean;
  title?: string;
}

export default memo(function LeaderFeed({ filter, title }: LeaderFeedProps = {}) {
  const { data, loading, error, lastUpdate } = useApiData<FeedItem[]>(api.leaders, REFRESH_MS);
  const { data: twitterData } = useApiData<TwitterIntelItem[]>(
    api.twitterIntel,
    REFRESH_MS,
    { enabled: !filter },
  );

  const allItems = data ?? [];
  const tweets = twitterData ?? [];

  const feed = useMemo(() => {
    if (filter) return allItems.filter(filter);

    // Unified feed: flash/urgent tweets + all items
    const flashTweets = tweets
      .filter(t => t.priority === 'flash' || t.priority === 'urgent')
      .map(tweetToFeedItem);
    return [...flashTweets, ...allItems];
  }, [filter, allItems, tweets]);

  const hasShownData = useRef(false);
  useEffect(() => { if (data) hasShownData.current = true; }, [data]);

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(255,200,50,0.025)', border: '1px solid rgba(255,200,50,0.10)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' }}
      >
        <div className="font-title text-[14px] font-semibold tracking-[2px] uppercase text-text-secondary">
          {title ? `📡 ${title}` : '📡 Leader Feed'}
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div style={{ padding: '8px 18px' }} className="text-[13px] text-critical font-data">
          Failed to load feed. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <Skeleton lines={6} />
      ) : (
        /* Feed items */
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {feed.length === 0 && data ? (
              <div className="flex items-center justify-center h-full py-8">
                <span className="font-data text-[13px] text-text-muted tracking-[0.5px]">No matching items</span>
              </div>
            ) : (
              <>
              {feed.map((item) => (
                <FeedItemRow key={item.id} item={item} />
              ))}
              </>
            )}
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
});

function FeedItemRow({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const textRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [item.text]);

  return (
    <div
      className="cursor-pointer transition-colors duration-150 hover:bg-bg-card-hover feed-item-enter"
      style={{
        borderBottom: '1px solid rgba(255,200,50,0.10)',
        borderLeft: `3px solid ${borderColors[item.category] || '#ffc832'}`,
        padding: '10px 18px 10px 14px',
      }}
    >
      {/* Flash tweet badge */}
      {item.id.startsWith('tw-') && (
        <div className="font-data text-[12px] text-[#1d9bf0] font-bold mb-1 tracking-[0.5px]">
          🐦 X ALERT
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-[6px] mb-1">
        <span className="text-[14px]">{item.flag}</span>
        <span className="font-data text-[13px] text-accent font-medium">{item.handle}</span>
        <span className="font-data text-[12px] text-text-muted ml-auto tracking-[0.3px]">{item.source}</span>
        <span className="font-data text-[12px] text-text-muted">{item.time}</span>
      </div>

      {/* Role */}
      <div className="text-[12px] text-text-muted font-data mb-1">{item.role}</div>

      {/* Text — truncated to 4 lines */}
      <div
        ref={textRef}
        className="text-[13px] leading-[1.45] text-text-primary relative"
        style={!expanded ? {
          display: '-webkit-box',
          WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical' as const,
          maxHeight: `calc(13px * 1.45 * 4)`,
        } : undefined}
      >
        <FeedText text={item.text} />
      </div>

      {/* Read more */}
      {isTruncated && !expanded && (
        <div
          className="font-data text-[12px] cursor-pointer mt-[4px] transition-colors duration-150"
          style={{ color: 'rgba(255,200,50,0.5)' }}
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ffc832'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,200,50,0.5)'; }}
        >
          Read more...
        </div>
      )}
      {expanded && (
        <div
          className="font-data text-[12px] cursor-pointer mt-[4px] transition-colors duration-150"
          style={{ color: 'rgba(255,200,50,0.5)' }}
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#ffc832'; }}
          onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(255,200,50,0.5)'; }}
        >
          Show less
        </div>
      )}

      {/* Engagement */}
      {item.engagement && (
        <div className="flex gap-3 mt-[6px] font-data text-[12px] text-text-muted">
          {item.engagement}
        </div>
      )}

      {/* Tags — gap 4px */}
      <div className="flex flex-wrap gap-[4px] mt-[6px]">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="font-data text-[12px] px-[5px] py-[1px] rounded-[2px]"
            style={{
              background: 'rgba(255,200,50,.12)',
              color: '#ffc832',
              border: '1px solid rgba(255,200,50,.28)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function FeedText({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold" style={{ color: '#ffe082' }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}
