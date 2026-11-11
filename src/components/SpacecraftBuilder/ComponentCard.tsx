import { Check, Minus, Plus, RotateCcw } from 'lucide-react';
import type { ToggleAction } from '../../engine/buildEditor';
import { getResource } from '../../data/resources';
import type { Inventory, ResourceId } from '../../types/resources';
import type { BuildStats, SpacecraftComponent } from '../../types/spacecraft';

interface Props {
  component: SpacecraftComponent;
  missionId: string;
  action: ToggleAction;
  /** Stats now, and stats if this card's button were pressed. */
  current: BuildStats;
  preview: BuildStats;
  isKey: boolean;
  /** Supplies needed to install this part, and which of them you are short of. */
  materials: Partial<Inventory>;
  shortOf: ResourceId[];
  onToggle: () => void;
}

/** Every specification a component can have, shown only when it applies. */
function specs(c: SpacecraftComponent, missionId: string): [string, string][] {
  const list: [string, string][] = [
    ['Mass', `${c.mass} kg`],
    ['Cost', `$${c.cost}M`],
    ['Reliability', `${(c.reliability * 100).toFixed(1)}%`],
  ];
  if (c.powerDraw) list.push(['Power draw', `${c.powerDraw} W`]);
  if (c.powerGen) list.push(['Generation', `${c.powerGen} W${c.solar ? ' at Earth' : ' constant'}`]);
  if (c.energyWh) list.push(['Storage', `${c.energyWh} Wh`]);
  if (c.thermal) list.push(['Thermal rating', `+${c.thermal}`]);
  if (c.hull) list.push(['Structural margin', `${c.hull}`]);
  if (c.commKbps) list.push(['Data rate', `${c.commKbps} kbps${c.relay ? ' (relay)' : ''}`]);
  if (c.science) list.push(['Science value', `${c.science[missionId] ?? 0} pts`]);
  if (c.dataGB) list.push(['Data produced', `${c.dataGB} GB`]);
  if (c.thrustKN) list.push(['Thrust', `${c.thrustKN} kN`]);
  if (c.efficiency) list.push(['Fuel efficiency', `×${c.efficiency}`]);
  if (c.fuelKg) list.push(['Propellant', `${c.fuelKg} kg`]);
  if (c.compute) list.push(['Processing', `${c.compute}`]);
  if (c.radHard) list.push(['Rad hardness', `${c.radHard}`]);
  if (c.storageGB) list.push(['Data storage', `${c.storageGB} GB`]);
  if (c.nav) list.push(['Nav accuracy', `${c.nav}`]);
  return list;
}

function Delta({ label, value, unit, goodWhenUp }: { label: string; value: number; unit: string; goodWhenUp: boolean }) {
  if (Math.abs(value) < 0.5) return null;
  const good = value > 0 === goodWhenUp;
  return (
    <span className={good ? 'text-phosphor' : 'text-amber'}>
      {label} {value > 0 ? '+' : '−'}{Math.abs(Math.round(value))}{unit}
    </span>
  );
}

const ACTION_UI: Record<ToggleAction, { text: string; icon: React.JSX.Element; style: string }> = {
  add: { text: 'Fit', icon: <Plus size={12} />, style: 'border-phosphor text-phosphor hover:bg-phosphor hover:text-void' },
  replace: { text: 'Replace', icon: <RotateCcw size={12} />, style: 'border-cyan text-cyan hover:bg-cyan hover:text-void' },
  remove: { text: 'Remove', icon: <Minus size={12} />, style: 'border-amber text-amber hover:bg-amber hover:text-void' },
  full: { text: 'Bay full', icon: <Minus size={12} />, style: 'border-line text-mute' },
};

export function ComponentCard({ component, missionId, action, current, preview, isKey, materials, shortOf, onToggle }: Props) {
  const fitted = action === 'remove';
  const blocked = shortOf.length > 0;
  const ui = blocked ? { text: 'Not enough supplies', icon: <Minus size={12} />, style: 'border-alert/60 text-alert' } : ACTION_UI[action];

  return (
    <article className={`flex flex-col border bg-panel p-3.5 transition-colors ${fitted ? 'border-phosphor bg-panel-hi' : 'border-line hover:border-line-hi'}`}>
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm text-ink">{component.name}</h4>
        {fitted && <span className="label flex shrink-0 items-center gap-1 !text-phosphor"><Check size={11} />Fitted</span>}
        {!fitted && isKey && <span className="label shrink-0 !text-cyan">Key for mission</span>}
      </div>
      <p className="mt-1 text-xs text-mute">{component.description}</p>
      <p className="mt-1.5 text-xs text-amber/90">⇄ {component.tradeoff}</p>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-0.5 border-t border-line pt-2 text-xs">
        {specs(component, missionId).map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-mute">{label}</dt>
            <dd className="tabular-nums text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line pt-2 text-[11px]">
        <span className="text-mute">REQUIRES</span>
        {(Object.keys(materials) as ResourceId[]).map((id) => {
          const r = getResource(id);
          const missing = shortOf.includes(id);
          return (
            <span key={id} className={`flex items-center gap-1 border px-1.5 py-0.5 ${missing ? 'border-alert text-alert' : 'border-line text-ink'}`}>
              <span className="h-2 w-2" style={{ background: r.css }} />
              {materials[id]} × {r.item}
            </span>
          );
        })}
      </div>

      <div className="mt-auto pt-3">
        {action !== 'full' && (
          <div className="mb-2 flex min-h-4 flex-wrap gap-x-3 text-[11px]">
            <span className="text-mute">{fitted ? 'IF REMOVED:' : 'IMPACT:'}</span>
            <Delta label="Cost" value={preview.cost - current.cost} unit="M" goodWhenUp={false} />
            <Delta label="Mass" value={preview.wetMass - current.wetMass} unit="kg" goodWhenUp={false} />
            <Delta label="Pwr margin" value={(preview.powerGen - preview.powerDraw) - (current.powerGen - current.powerDraw)} unit="W" goodWhenUp />
            <Delta label="Fuel need" value={preview.fuelRequired - current.fuelRequired} unit="kg" goodWhenUp={false} />
          </div>
        )}
        <button
          onClick={onToggle}
          disabled={action === 'full' || blocked}
          className={`flex w-full items-center justify-center gap-1.5 border py-1.5 text-xs uppercase tracking-[0.14em] transition-colors ${ui.style}`}
        >
          {ui.icon}{ui.text}
        </button>
      </div>
    </article>
  );
}
