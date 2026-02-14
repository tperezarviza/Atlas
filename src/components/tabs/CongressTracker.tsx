import { useState } from 'react';
import { useApiData } from '../../hooks/useApiData';
import { api } from '../../services/api';
import type { CongressBill, SenateNomination } from '../../types';
import DataBadge from '../DataBadge';

const REFRESH_MS = 300_000; // 5 min

const PARTY_COLORS: Record<string, { bg: string; text: string }> = {
  R: { bg: 'rgba(255,200,50,.15)',  text: '#ffc832' },
  D: { bg: 'rgba(255,59,59,.15)',   text: '#ff3b3b' },
  I: { bg: 'rgba(168,85,247,.15)',  text: '#a855f7' },
};

const NOM_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(212,167,44,.15)', text: '#d4a72c' },
  confirmed: { bg: 'rgba(0,255,136,.15)',  text: '#00ff88' },
  rejected:  { bg: 'rgba(255,59,59,.15)',  text: '#ff3b3b' },
  withdrawn: { bg: 'rgba(255,200,50,.15)',  text: '#7a6418' },
};

const BILL_STAGES: { key: string; label: string }[] = [
  { key: 'introduced', label: 'Intro' },
  { key: 'committee', label: 'Cmte' },
  { key: 'passed_house', label: 'House' },
  { key: 'passed_senate', label: 'Senate' },
  { key: 'signed', label: 'Signed' },
];

const STAGE_INDEX: Record<string, number> = {
  introduced: 0,
  committee: 1,
  passed_house: 2,
  passed_senate: 3,
  signed: 4,
  vetoed: 4,
};

function BillPipeline({ status }: { status: string }) {
  const currentIdx = STAGE_INDEX[status] ?? 0;
  return (
    <div className="flex items-center gap-0 mt-[3px]">
      {BILL_STAGES.map((stage, i) => {
        const filled = i <= currentIdx;
        return (
          <div key={stage.key} className="flex items-center">
            {/* Dot */}
            <div
              className="w-[6px] h-[6px] rounded-full shrink-0"
              style={{
                background: filled ? '#ffc832' : 'rgba(255,200,50,.08)',
                border: filled ? 'none' : '1px solid rgba(255,255,255,.12)',
              }}
              title={stage.label}
            />
            {/* Connector line (not after last) */}
            {i < BILL_STAGES.length - 1 && (
              <div
                className="h-[1px] w-[10px]"
                style={{
                  background: i < currentIdx ? '#ffc832' : 'rgba(255,200,50,.08)',
                }}
              />
            )}
          </div>
        );
      })}
      <span className="font-data text-[7px] text-text-muted ml-[4px] uppercase">
        {BILL_STAGES[currentIdx]?.label ?? status}
      </span>
    </div>
  );
}

export default function CongressTracker() {
  const { data: billsData, loading: billsLoading, error: billsError, lastUpdate: billsLastUpdate } =
    useApiData<CongressBill[]>(api.congressBills, REFRESH_MS);
  const { data: nomsData, loading: nomsLoading, error: nomsError, lastUpdate: nomsLastUpdate } =
    useApiData<SenateNomination[]>(api.congressNominations, REFRESH_MS);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    bills: true,
    nominations: true,
  });

  const toggle = (key: string) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));

  const bills = billsData ?? [];
  const noms = nomsData ?? [];

  // Aggregate loading/error for badge
  const loading = billsLoading || nomsLoading;
  const error = billsError || nomsError;
  const data = billsData || nomsData;
  const lastUpdate = billsLastUpdate && nomsLastUpdate
    ? (billsLastUpdate > nomsLastUpdate ? billsLastUpdate : nomsLastUpdate)
    : billsLastUpdate ?? nomsLastUpdate;

  return (
    <div className="h-full flex flex-col rounded-[14px] overflow-hidden" style={{ background: '#000000', border: '1px solid rgba(255,200,50,0.10)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0"
        style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)', minHeight: 32 }}
      >
        <div className="font-title text-[12px] font-semibold tracking-[2px] uppercase text-text-secondary">
          🏛️ Congress Tracker
        </div>
        <DataBadge data={data} error={error} loading={loading} lastUpdate={lastUpdate} intervalMs={REFRESH_MS} />
      </div>

      {/* Error message */}
      {error && !data && (
        <div className="px-3 py-2 text-[10px] text-critical font-data" style={{ background: 'rgba(255,59,59,.04)' }}>
          Failed to load congress data. Retrying...
        </div>
      )}

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* KEY BILLS */}
        <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
          <div
            className="flex items-center px-[10px] py-[5px] cursor-pointer select-none hover:bg-bg-card-hover transition-colors"
            onClick={() => toggle('bills')}
          >
            <span className="font-data text-[10px] text-text-muted mr-1">
              {openSections.bills ? '▾' : '▸'}
            </span>
            <span className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase">
              KEY BILLS
            </span>
          </div>
          {openSections.bills && (
            <div className="pb-[4px]">
              {bills.map(bill => {
                const partyStyle = PARTY_COLORS[bill.party] ?? PARTY_COLORS.I;
                return (
                  <div
                    key={bill.number}
                    className="px-[10px] py-[5px] hover:bg-bg-card-hover transition-colors"
                    style={{ borderTop: '1px solid rgba(20,35,63,.5)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-data text-[8px] text-text-muted mb-[1px]">
                          {bill.number}
                        </div>
                        <div className="font-data text-[11px] text-text-primary leading-tight">
                          {bill.title}
                        </div>
                        <div className="flex items-center gap-[4px] mt-[2px]">
                          <span className="font-data text-[9px] text-text-muted">
                            {bill.sponsor}
                          </span>
                          <span
                            className="font-data text-[7px] px-[3px] py-[0.5px] rounded-[2px] uppercase"
                            style={{ background: partyStyle.bg, color: partyStyle.text }}
                          >
                            {bill.party}
                          </span>
                        </div>
                      </div>
                    </div>
                    <BillPipeline status={bill.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* NOMINATIONS */}
        <div style={{ borderBottom: '1px solid rgba(255,200,50,0.10)' }}>
          <div
            className="flex items-center px-[10px] py-[5px] cursor-pointer select-none hover:bg-bg-card-hover transition-colors"
            onClick={() => toggle('nominations')}
          >
            <span className="font-data text-[10px] text-text-muted mr-1">
              {openSections.nominations ? '▾' : '▸'}
            </span>
            <span className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase">
              NOMINATIONS
            </span>
          </div>
          {openSections.nominations && (
            <div className="pb-[4px]">
              {noms.map(nom => {
                const statusStyle = NOM_STATUS_COLORS[nom.status] ?? NOM_STATUS_COLORS.pending;
                return (
                  <div
                    key={nom.name}
                    className="flex items-center justify-between px-[10px] py-[4px] hover:bg-bg-card-hover transition-colors"
                    style={{ borderTop: '1px solid rgba(20,35,63,.5)' }}
                  >
                    <div className="min-w-0">
                      <div className="font-data text-[11px] text-text-primary">
                        {nom.name}
                      </div>
                      <div className="font-data text-[9px] text-text-muted">
                        {nom.position} — {nom.agency}
                      </div>
                    </div>
                    <span
                      className="font-data text-[7px] px-[4px] py-[1px] rounded-[2px] uppercase shrink-0 ml-2"
                      style={{ background: statusStyle.bg, color: statusStyle.text }}
                    >
                      {nom.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
