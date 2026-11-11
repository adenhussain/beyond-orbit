import { Rocket, X } from 'lucide-react';
import { CATEGORIES, SLOTS, getComponent } from '../../data/spacecraftComponents';
import type { Build, BuildIssue, BuildStats } from '../../types/spacecraft';
import { Button } from '../UI/Button';
import { Panel } from '../UI/Panel';
import { WarningsPanel } from './WarningsPanel';

interface Props {
  build: Build;
  stats: BuildStats;
  issues: BuildIssue[];
  onClose: () => void;
  onLaunch: () => void;
}

/** Final go/no-go review of the whole design before committing to launch. */
export function ConfigReview({ build, stats, issues, onClose, onLaunch }: Props) {
  const warnings = issues.filter((i) => i.level === 'warn');
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/85 p-4" role="dialog" aria-modal="true">
      <Panel
        title="Flight Readiness Review"
        right={<button onClick={onClose} aria-label="Close review" className="hover:text-cyan"><X size={14} /></button>}
        className="max-h-full w-full max-w-4xl"
        bodyClassName="overflow-auto p-5"
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="label mb-2 text-cyan">Final configuration</h3>
            <div className="space-y-3">
              {CATEGORIES.map((category) => (
                <div key={category.id}>
                  <div className="label">{category.label}</div>
                  <ul className="mt-0.5 text-sm">
                    {SLOTS.filter((s) => s.category === category.id).flatMap((slot) =>
                      build[slot.id].map((id) => {
                        const c = getComponent(id);
                        return (
                          <li key={id} className="flex justify-between gap-3 border-b border-line/50 py-0.5">
                            <span className="text-ink">{c.name}</span>
                            <span className="shrink-0 tabular-nums text-mute">{c.mass} kg · ${c.cost}M</span>
                          </li>
                        );
                      }),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="label mb-2 text-cyan">Totals</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {[
                ['Cost', `$${stats.cost}M of $${stats.budget}M`],
                ['Launch mass', `${Math.round(stats.wetMass)} of ${stats.maxMass} kg`],
                ['Power margin', `${stats.powerMarginPct.toFixed(0)}%`],
                ['Fuel reserve', `${stats.fuelReservePct.toFixed(0)}%`],
                ['Thermal rating', `${stats.thermalRating} of ${stats.thermalDemand}`],
                ['Thrust-to-weight', stats.twr.toFixed(2)],
                ['Science potential', `${stats.sciencePoints} of ${stats.scienceTarget} pts`],
                ['Downlink', `${stats.commCapacityGB.toFixed(1)} GB for ${stats.dataGeneratedGB} GB`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-2 border-b border-line/50 py-0.5">
                  <dt className="text-mute">{label}</dt>
                  <dd className="tabular-nums text-phosphor">{value}</dd>
                </div>
              ))}
            </dl>
            <h3 className="label mb-2 mt-5 text-amber">
              {warnings.length > 0 ? `${warnings.length} accepted risk${warnings.length > 1 ? 's' : ''}` : 'Risk assessment'}
            </h3>
            <WarningsPanel issues={issues} />
            {warnings.length > 0 && (
              <p className="mt-3 text-xs text-mute">
                You may launch with these risks. They become technical debt and can trigger hazards in flight.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex justify-between border-t border-line pt-4">
          <Button variant="ghost" onClick={onClose}>Back to Lab</Button>
          <Button size="lg" icon={<Rocket size={15} />} onClick={onLaunch}>Go for Launch</Button>
        </div>
      </Panel>
    </div>
  );
}
