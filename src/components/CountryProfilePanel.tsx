import { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import StrategicDepsViz from './StrategicDepsViz';
import type { CountryProfile, Conflict, ArmedGroup, StrategicDependency } from '../types';

const ALLIANCE_COLORS: Record<string, string> = {
  NATO: '#ffc832',
  BRICS: '#ff3b3b',
  SCO: '#d4a72c',
  EU: '#ffc832',
  'Five Eyes': '#00ff88',
  CSTO: '#ff8c00',
  AUKUS: '#1abcdb',
  QUAD: '#a855f7',
};

const US_REL_COLORS: Record<string, string> = {
  Ally: '#00ff88',
  Partner: '#ffc832',
  Neutral: '#d4a72c',
  Competitor: '#ff8c00',
  Adversary: '#ff3b3b',
};

function formatPop(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}

function riskBarColor(val: number, max: number, invert?: boolean): string {
  const pct = invert ? 1 - val / max : val / max;
  if (pct > 0.7) return '#ff3b3b';
  if (pct > 0.4) return '#d4a72c';
  return '#00ff88';
}

interface CountryProfilePanelProps {
  countryCode: string | null;
  onClose: () => void;
  conflicts: Conflict[];
}

export default function CountryProfilePanel({ countryCode, onClose, conflicts }: CountryProfilePanelProps) {
  const [profile, setProfile] = useState<CountryProfile | null>(null);
  const [armedGroups, setArmedGroups] = useState<ArmedGroup[]>([]);
  const [dependencies, setDependencies] = useState<StrategicDependency[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!countryCode) {
      setProfile(null);
      setArmedGroups([]);
      setDependencies([]);
      setFetchError(null);
      return;
    }

    const thisId = ++fetchIdRef.current;
    setLoading(true);
    setFetchError(null);

    Promise.allSettled([
      api.country(countryCode),
      api.armedGroups(),
      api.dependencies(),
    ]).then(([profileResult, groupsResult, depsResult]) => {
      if (thisId !== fetchIdRef.current) return;

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value);
      } else {
        setProfile(null);
        setFetchError('Failed to load country profile');
      }
      if (groupsResult.status === 'fulfilled') {
        setArmedGroups(groupsResult.value.filter(g => g.countries.includes(countryCode)));
      }
      if (depsResult.status === 'fulfilled') {
        setDependencies(depsResult.value);
      }
      setLoading(false);
    });
  }, [countryCode]);

  const countryConflicts = conflicts.filter(c => {
    if (!profile) return false;
    return c.name.toLowerCase().includes(profile.name.toLowerCase()) || c.region.toLowerCase().includes(profile.name.toLowerCase());
  });

  return (
    <>
      {countryCode && (
        <div
          className="fixed right-0 z-[900] overflow-hidden flex flex-col"
          style={{
            top: 48,
            bottom: 78,
            width: 480,
            background: '#000000',
            borderLeft: '1px solid rgba(255,200,50,0.10)',
            boxShadow: '-8px 0 32px rgba(0,0,0,.4)',
            transform: 'translateX(0)',
            transition: 'transform 0.2s ease-out',
            willChange: 'transform',
          }}
        >
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="font-data text-[11px] text-text-muted">Loading country profile...</span>
            </div>
          ) : fetchError || !profile ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-2">
              <span className="font-data text-[11px] text-critical">{fetchError ?? 'Country not found'}</span>
              <button
                onClick={onClose}
                className="font-data text-[10px] text-accent hover:text-text-primary cursor-pointer"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div
                className="flex items-center gap-3 px-4 py-3 shrink-0"
                style={{ borderBottom: '1px solid rgba(255,200,50,0.10)', background: 'rgba(255,200,50,0.025)' }}
              >
                <button
                  onClick={onClose}
                  className="text-text-muted hover:text-text-primary text-[16px] cursor-pointer shrink-0"
                >
                  ✕
                </button>
                <span className="text-[28px]">{profile.flag}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-title text-[16px] font-semibold text-text-primary truncate">
                    {profile.name}
                  </div>
                  <div className="flex items-center gap-2 mt-[1px]">
                    <span className="font-data text-[9px] px-[4px] py-[1px] rounded-[2px] bg-accent/15 text-accent uppercase">
                      {profile.code}
                    </span>
                    <span className="font-data text-[8px] text-text-muted truncate">
                      {profile.government}
                    </span>
                    {profile.usRelationship && (
                      <span
                        className="font-data text-[8px] px-[4px] py-[1px] rounded-[2px] uppercase"
                        style={{
                          background: `${US_REL_COLORS[profile.usRelationship] ?? '#7a6418'}20`,
                          color: US_REL_COLORS[profile.usRelationship] ?? '#7a6418',
                        }}
                      >
                        {profile.usRelationship}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto">
                {/* Overview */}
                <Section title="Overview">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <Field label="Capital" value={profile.capital} />
                    <Field label="Population" value={formatPop(profile.population)} />
                    <Field label="GDP" value={`$${profile.gdp}B`} />
                    <Field label="Leader" value={`${profile.leader} (${profile.leaderTitle})`} />
                  </div>
                </Section>

                {/* Alliances */}
                {profile.alliances.length > 0 && (
                  <Section title="Alliances">
                    <div className="flex flex-wrap gap-1">
                      {profile.alliances.map(a => {
                        const baseKey = Object.keys(ALLIANCE_COLORS).find(k => a.includes(k));
                        const color = baseKey ? ALLIANCE_COLORS[baseKey] : '#7a6418';
                        return (
                          <span
                            key={a}
                            className="font-data text-[8px] px-[5px] py-[2px] rounded-[2px]"
                            style={{ background: `${color}20`, color }}
                          >
                            {a}
                          </span>
                        );
                      })}
                    </div>
                  </Section>
                )}

                {/* Military */}
                <Section title="Military">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <Field label="Active Personnel" value={profile.military.activePersonnel.toLocaleString()} />
                    <Field label="Reserve" value={profile.military.reservePersonnel.toLocaleString()} />
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-data text-[9px] text-text-muted">Nuclear:</span>
                    <NuclearBadge status={profile.military.nuclearStatus} />
                  </div>
                  <div className="font-data text-[9px] text-text-muted mt-1">
                    Branches: {profile.military.branches.join(', ')}
                  </div>
                </Section>

                {/* Risk Assessment */}
                {(profile.fsiScore != null || profile.corruptionIndex != null || profile.pressFreedom != null) && (
                  <Section title="Risk Assessment">
                    {profile.fsiScore != null && (
                      <RiskBar label="Fragile States Index" value={profile.fsiScore} max={120} category={profile.fsiCategory} />
                    )}
                    {profile.corruptionIndex != null && (
                      <RiskBar label="Corruption (CPI)" value={profile.corruptionIndex} max={100} invert />
                    )}
                    {profile.pressFreedom != null && (
                      <RiskBar label="Press Freedom" value={profile.pressFreedom} max={100} />
                    )}
                  </Section>
                )}

                {/* Sanctions */}
                <Section title="Sanctions">
                  {profile.sanctioned ? (
                    <div>
                      <span className="font-data text-[9px] px-[5px] py-[2px] rounded-[2px] bg-critical/15 text-critical font-semibold uppercase">
                        SANCTIONED
                      </span>
                      <div className="font-data text-[9px] text-text-muted mt-1">
                        Programs: {profile.sanctionPrograms.join(', ')}
                      </div>
                    </div>
                  ) : (
                    <span className="font-data text-[9px] px-[5px] py-[2px] rounded-[2px] bg-positive/15 text-positive">
                      No active sanctions
                    </span>
                  )}
                </Section>

                {/* Active Conflicts */}
                <Section title={`Active Conflicts (${countryConflicts.length})`}>
                  {countryConflicts.length === 0 ? (
                    <span className="font-data text-[9px] text-text-muted">No active conflicts tracked</span>
                  ) : (
                    countryConflicts.map(c => (
                      <div key={c.id} className="flex items-center gap-2 py-[2px]">
                        <span
                          className="w-[5px] h-[5px] rounded-full shrink-0"
                          style={{
                            background: c.severity === 'critical' ? '#ff3b3b' : c.severity === 'high' ? '#ff8c00' : '#d4a72c',
                          }}
                        />
                        <span className="font-data text-[9px] text-text-primary">{c.name}</span>
                        <span className="font-data text-[8px] text-text-muted uppercase">{c.severity}</span>
                      </div>
                    ))
                  )}
                </Section>

                {/* Armed Groups */}
                <Section title={`Armed Groups (${armedGroups.length})`}>
                  {armedGroups.length === 0 ? (
                    <span className="font-data text-[9px] text-text-muted">No tracked armed groups</span>
                  ) : (
                    <>
                      {armedGroups.slice(0, 5).map(g => (
                        <div key={g.id} className="flex items-center gap-2 py-[2px]">
                          <span
                            className="font-data text-[7px] px-[3px] py-[0.5px] rounded-[2px] uppercase shrink-0"
                            style={{ background: 'rgba(255,59,59,.12)', color: '#ff3b3b' }}
                          >
                            {g.type}
                          </span>
                          <span className="font-data text-[9px] text-text-primary truncate">{g.name}</span>
                        </div>
                      ))}
                      {armedGroups.length > 5 && (
                        <span className="font-data text-[8px] text-text-muted">
                          and {armedGroups.length - 5} more
                        </span>
                      )}
                    </>
                  )}
                </Section>

                {/* Recent Intel */}
                {(profile.recentEvents != null || profile.sentiment != null) && (
                  <Section title="Recent Intel">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {profile.recentEvents != null && (
                        <Field label="ACLED Events" value={profile.recentEvents.toString()} />
                      )}
                      {profile.sentiment != null && (
                        <div className="flex items-center gap-1">
                          <span className="font-data text-[9px] text-text-muted">Sentiment:</span>
                          <span
                            className="font-data text-[10px] font-semibold"
                            style={{ color: profile.sentiment > 0 ? '#00ff88' : profile.sentiment < -3 ? '#ff3b3b' : '#d4a72c' }}
                          >
                            {profile.sentiment > 0 ? '+' : ''}{profile.sentiment.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </Section>
                )}

                {/* Strategic Dependencies */}
                {dependencies.length > 0 && (
                  <Section title="Strategic Dependencies">
                    <StrategicDepsViz dependencies={dependencies} />
                  </Section>
                )}

                {/* Bottom spacer */}
                <div className="h-4" />
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-[8px]" style={{ borderBottom: '1px solid rgba(255,200,50,0.06)' }}>
      <div className="font-data text-[8px] tracking-[1.5px] text-text-muted uppercase mb-[4px]">
        {title}
      </div>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-data text-[9px] text-text-muted">{label}</span>
      <span className="font-data text-[9px] text-text-primary font-medium">{value}</span>
    </div>
  );
}

function NuclearBadge({ status }: { status: string }) {
  const styles: Record<string, { bg: string; color: string }> = {
    declared:     { bg: 'rgba(255,59,59,.15)', color: '#ff3b3b' },
    undeclared:   { bg: 'rgba(255,140,0,.15)', color: '#ff8c00' },
    pursuing:     { bg: 'rgba(212,167,44,.15)', color: '#d4a72c' },
    threshold:    { bg: 'rgba(212,167,44,.15)', color: '#d4a72c' },
    nato_sharing: { bg: 'rgba(255,200,50,.15)', color: '#ffc832' },
    none:         { bg: 'rgba(255,200,50,.06)', color: '#7a6418' },
  };
  const s = styles[status] ?? styles.none;
  return (
    <span
      className="font-data text-[8px] px-[4px] py-[1px] rounded-[2px] uppercase"
      style={{ background: s.bg, color: s.color }}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

function RiskBar({ label, value, max, invert, category }: { label: string; value: number; max: number; invert?: boolean; category?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = riskBarColor(value, max, invert);

  return (
    <div className="mt-[3px]">
      <div className="flex justify-between items-center">
        <span className="font-data text-[9px] text-text-muted">{label}</span>
        <span className="font-data text-[9px] font-semibold" style={{ color }}>
          {value}/{max}
          {category && <span className="text-[8px] text-text-muted ml-1">({category})</span>}
        </span>
      </div>
      <div className="h-[3px] rounded-full mt-[2px]" style={{ background: 'rgba(255,200,50,.06)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
