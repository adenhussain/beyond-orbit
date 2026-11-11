import { RESOURCES, buildMaterials } from '../../data/resources';
import type { Inventory } from '../../types/resources';
import type { Build } from '../../types/spacecraft';

interface Props {
  inventory: Inventory;
  /** If given, each cell also shows how many the current design needs. */
  build?: Build;
  large?: boolean;
}

/** The supplies the astronaut is carrying. Shared by the HUD and the workshop. */
export function InventoryHud({ inventory, build, large = false }: Props) {
  const needed = build ? buildMaterials(build) : null;
  return (
    <div className={`grid ${large ? 'grid-cols-4 gap-2' : 'grid-cols-4 gap-1'}`}>
      {RESOURCES.map((r) => {
        const have = inventory[r.id];
        const need = needed?.[r.id] ?? 0;
        const short = needed !== null && need > have;
        return (
          <div
            key={r.id}
            title={`${r.label}: ${have} collected${needed ? `, ${need} needed by the design` : ''}`}
            className={`flex items-center gap-1.5 border bg-void/80 px-1.5 py-1 ${short ? 'border-alert' : 'border-line'}`}
          >
            <span className="h-3 w-3 shrink-0 border" style={{ borderColor: r.css, background: have > 0 ? r.css : 'transparent' }} />
            <span className="text-[10px] tracking-wider text-mute">{r.short}</span>
            <span className={`ml-auto text-sm tabular-nums ${short ? 'text-alert' : have > 0 ? 'text-ink' : 'text-mute'}`}>
              {needed && r.id !== 'repair' ? `${need}/${have}` : have}
            </span>
          </div>
        );
      })}
    </div>
  );
}
