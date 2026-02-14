import { useRef, useEffect } from 'react';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import type { MarketsResponse } from '../services/api';
import { mockMarketSections, mockForexSections } from '../data/mockMarkets';
import type { MarketSection, MarketItem } from '../types';
import MaybeFadeIn from './MaybeFadeIn';
import DataBadge from './DataBadge';
import Skeleton from './Skeleton';

const REFRESH_MS = 300_000; // 5 min

// Regional sections to KEEP (ME/Africa eliminated per user request)
const KEEP_REGIONS = new Set(['Americas', 'Europe', 'Asia-Pacific']);

function SimplifiedMarketRow({ item }: { item: MarketItem }) {
  const flashClass = item.direction === 'up' ? 'flash-up' : item.direction === 'down' ? 'flash-down' : '';
  return (
    <div
      className="flex items-center transition-colors duration-150 hover:bg-bg-card-hover"
      style={{ padding: '3px 18px', height: 28, gap: 6 }}
    >
      <span className="font-data text-[10px] text-text-secondary" style={{ flex: '0 0 85px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {item.name}
      </span>
      <span style={{ flex: 1 }} />
      <span className="font-data text-[11px] font-semibold text-text-primary" style={{ flex: '0 0 85px', textAlign: 'right', paddingRight: 4 }}>
        {item.price}
      </span>
      <span
        key={item.delta}
        className={`font-data text-[10px] font-medium ${flashClass} ${
          item.direction === 'up'
            ? 'text-positive'
            : item.direction === 'down'
            ? 'text-critical'
            : 'text-text-muted'
        }`}
        style={{ flex: '0 0 62px', textAlign: 'right', whiteSpace: 'nowrap' }}
      >
        {item.delta}
      </span>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon?: string }) {
  return (
    <div
      style={{
        padding: '6px 18px',
        borderBottom: '1px solid rgba(255,200,50,0.08)',
        marginBottom: 4,
      }}
    >
      <span className="font-data text-[8px] tracking-[1.2px] text-text-muted uppercase">
        {icon ? `${icon} ` : ''}{title}
      </span>
    </div>
  );
}

export default function MarketsDashboard() {
  const { data, loading, error, lastUpdate } = useApiData<MarketsResponse>(api.markets, REFRESH_MS);
  const hasShownData = useRef(false);
  useEffect(() => { if (data) hasShownData.current = true; }, [data]);

  const sections = data?.sections ?? mockMarketSections;
  const forex = data?.forex ?? mockForexSections;

  // Regional indices: keep Americas, Europe, Asia-Pacific as separate sections (no ME/Africa)
  // No sparklines — just name + price + delta
  const regionalSections = sections.filter(s => KEEP_REGIONS.has(s.title));

  // Commodities & Energy — merge Energy + Precious Metals + Geopolitical Commodities
  const commoditySections = sections.filter(s => s.title === 'Energy' || s.title === 'Precious Metals' || s.title === 'Geopolitical Commodities');
  const commodityItems = commoditySections.flatMap(s => s.items);

  // Crypto section
  const cryptoSection = sections.find(s => s.title === 'Crypto');
  const cryptoItems = cryptoSection?.items ?? [];

  // Forex: only USD/ARS — unified with crypto in one section
  const usdArs = forex.flatMap(s => s.items).filter(item => /USD\/ARS/i.test(item.name));

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden panel-glow" style={{ background: 'rgba(255,200,50,0.025)', border: '1px solid rgba(255,200,50,0.10)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32, padding: '14px 18px 10px 18px' }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          💹 Markets & Indicators
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div style={{ padding: '8px 18px' }} className="text-[10px] text-critical font-data" >
          Failed to load markets. Retrying...
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data ? (
        <Skeleton lines={8} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <MaybeFadeIn show={hasShownData.current}>
            {/* Regional Indices — Americas, Europe, Asia-Pacific (separate sections) */}
            {regionalSections.map((section, idx) => (
              section.items.length > 0 && (
                <div key={section.title} style={{ marginTop: idx > 0 ? 14 : 0 }}>
                  <SectionHeader title={section.title} icon={section.icon} />
                  <div className="pb-[2px]">
                    {section.items.map(item => (
                      <SimplifiedMarketRow key={item.name} item={item} />
                    ))}
                  </div>
                </div>
              )
            ))}

            {/* Commodities & Energy (unified: oil + metals + geo commodities) */}
            {commodityItems.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <SectionHeader title="Commodities & Energy" icon="🛢️" />
                <div className="pb-[2px]">
                  {commodityItems.map(item => (
                    <SimplifiedMarketRow key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Crypto + USD/ARS (unified section) */}
            {(cryptoItems.length > 0 || usdArs.length > 0) && (
              <div style={{ marginTop: 14 }}>
                <SectionHeader title="Crypto & Forex" icon="₿" />
                <div className="pb-[2px]">
                  {cryptoItems.map(item => (
                    <SimplifiedMarketRow key={item.name} item={item} />
                  ))}
                  {usdArs.map(item => (
                    <SimplifiedMarketRow key={item.name} item={item} />
                  ))}
                </div>
              </div>
            )}
          </MaybeFadeIn>
        </div>
      )}
    </div>
  );
}
