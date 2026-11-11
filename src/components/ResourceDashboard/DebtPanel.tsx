import { Cpu, Radio, Thermometer, Zap } from 'lucide-react';
import { DEBT_LABEL } from '../../engine/resourceCalculator';
import { DEBT_TYPES, debtLevel } from '../../engine/technicalDebt';
import type { DebtType, Debts } from '../../types/spacecraft';
import { Meter } from '../UI/Meter';
import type { Tone } from '../UI/Panel';

const ICONS: Record<DebtType, React.JSX.Element> = {
  thermal: <Thermometer size={11} />,
  power: <Zap size={11} />,
  reliability: <Cpu size={11} />,
  comm: <Radio size={11} />,
};

const LEVEL_TONE: Record<ReturnType<typeof debtLevel>, Tone> = {
  low: 'good',
  elevated: 'warn',
  high: 'warn',
  critical: 'crit',
};

/** Technical debt gauges, used in the lab and in flight. */
export function DebtPanel({ debts }: { debts: Debts }) {
  return (
    <div className="space-y-3">
      {DEBT_TYPES.map((type) => {
        const level = debtLevel(debts[type]);
        return (
          <Meter
            key={type}
            icon={ICONS[type]}
            label={`${DEBT_LABEL[type]} debt`}
            value={`${Math.round(debts[type])} · ${level.toUpperCase()}`}
            pct={debts[type]}
            tone={LEVEL_TONE[level]}
            marker={60}
          />
        );
      })}
      <p className="text-[11px] leading-tight text-mute">
        Debt is risk you carry into flight. Above the marker, hazards begin to trigger.
      </p>
    </div>
  );
}
