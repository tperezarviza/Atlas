import type { StrategicDependency, SupplyRisk } from '../types';

interface StrategicDepsVizProps {
  dependencies: StrategicDependency[];
}

const RISK_COLORS: Record<SupplyRisk, string> = {
  critical: '#ff3b3b',
  high: '#ff8c00',
  medium: '#d4a72c',
  low: '#00ff88',
};

export default function StrategicDepsViz({ dependencies }: StrategicDepsVizProps) {
  if (dependencies.length === 0) {
    return <span className="font-data text-[9px] text-text-muted">No strategic dependency data</span>;
  }

  return (
    <div className="space-y-[6px]">
      {dependencies.map((dep, i) => {
        const sharePct = parseFloat(dep.topProducerShare) || 0;
        const importPct = parseFloat(dep.usImportDep) || 0;
        const riskColor = RISK_COLORS[dep.supplyRisk] ?? '#d4a72c';

        return (
          <div key={i}>
            {/* Resource header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-[4px]">
                <span className="text-[11px]">{dep.icon}</span>
                <span className="font-data text-[9px] text-text-primary font-medium">{dep.resource}</span>
              </div>
              <span
                className="font-data text-[7px] px-[3px] py-[0.5px] rounded-[2px] uppercase"
                style={{ background: `${riskColor}20`, color: riskColor }}
              >
                {dep.supplyRisk}
              </span>
            </div>

            {/* Producer share bar */}
            <div className="flex items-center gap-2 mt-[2px]">
              <span className="font-data text-[8px] text-text-muted w-[60px] truncate">{dep.topProducer}</span>
              <div className="flex-1 h-[4px] rounded-full" style={{ background: 'rgba(255,200,50,.2)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, sharePct)}%`, background: riskColor }}
                />
              </div>
              <span className="font-data text-[8px] text-text-muted w-[28px] text-right">{dep.topProducerShare}</span>
            </div>

            {/* US import dependency */}
            {importPct > 0 && (
              <div className="flex items-center gap-2 mt-[1px]">
                <span className="font-data text-[8px] text-text-muted w-[60px]">US Import</span>
                <div className="flex-1 h-[3px] rounded-full" style={{ background: 'rgba(255,200,50,.2)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.min(100, importPct)}%`, background: '#ffc832' }}
                  />
                </div>
                <span className="font-data text-[8px] text-text-muted w-[28px] text-right">{dep.usImportDep}</span>
              </div>
            )}

            {/* Notes */}
            {dep.notes && (
              <div className="font-data text-[7px] text-text-muted mt-[1px] truncate">{dep.notes}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
