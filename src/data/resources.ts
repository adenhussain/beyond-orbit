import type { Inventory, ResourceDef, ResourceId } from '../types/resources';
import type { Build, SlotId, SpacecraftComponent } from '../types/spacecraft';
import { COMPONENTS, getComponent } from './spacecraftComponents';

export const RESOURCES: ResourceDef[] = [
  { id: 'structural', label: 'Structural Materials', item: 'Structural Metal', short: 'STR', color: 0x9fb3c8, css: '#9fb3c8' },
  { id: 'electronics', label: 'Electronics', item: 'Circuit Board', short: 'ELC', color: 0x5dfc9a, css: '#5dfc9a' },
  { id: 'power', label: 'Power Components', item: 'Solar Cell / Battery Unit', short: 'PWR', color: 0xffd447, css: '#ffd447' },
  { id: 'fuel', label: 'Fuel', item: 'Fuel Cell', short: 'FUE', color: 0xff7a45, css: '#ff7a45' },
  { id: 'thermal', label: 'Thermal Protection', item: 'Thermal Insulation', short: 'THM', color: 0xf2e6c9, css: '#f2e6c9' },
  { id: 'comms', label: 'Communication Equipment', item: 'Antenna Module', short: 'COM', color: 0x74d4ff, css: '#74d4ff' },
  { id: 'science', label: 'Scientific Equipment', item: 'Instrument Core', short: 'SCI', color: 0xc48bff, css: '#c48bff' },
  { id: 'repair', label: 'Repair Supplies', item: 'Repair Kit', short: 'REP', color: 0xff4f4f, css: '#ff4f4f' },
];

export function getResource(id: ResourceId): ResourceDef {
  return RESOURCES.find((r) => r.id === id)!;
}

export function emptyInventory(): Inventory {
  return { structural: 0, electronics: 0, power: 0, fuel: 0, thermal: 0, comms: 0, science: 0, repair: 0 };
}

/** Which supply each slot is mainly built from. */
const SLOT_RESOURCE: Record<SlotId, ResourceId> = {
  bus: 'structural', thermal: 'thermal', generation: 'power', storage: 'power',
  instruments: 'science', antenna: 'comms', backup: 'comms', engine: 'electronics',
  tank: 'fuel', cpu: 'electronics', nav: 'electronics',
};

/**
 * Materials needed to install a component. Better components in a slot need
 * more supplies: the cheapest needs 1, the next 2, and so on.
 */
export function materialsFor(component: SpacecraftComponent): Partial<Inventory> {
  const tier = COMPONENTS.filter((c) => c.slot === component.slot)
    .sort((a, b) => a.cost - b.cost)
    .findIndex((c) => c.id === component.id) + 1;
  switch (component.slot) {
    case 'bus': return { structural: tier + 1 };
    case 'engine': return { structural: 1, electronics: 1 };
    case 'instruments': return { science: component.id === 'sci_drill' ? 2 : 1 };
    case 'backup': return { comms: 1 };
    case 'nav': return { electronics: tier === 3 ? 2 : 1 };
    case 'generation': return component.id === 'pw_rtg' ? { power: 2, electronics: 1 } : { power: tier };
    default: return { [SLOT_RESOURCE[component.slot]]: tier };
  }
}

/** Total supplies the whole design needs. */
export function buildMaterials(build: Build): Inventory {
  const total = emptyInventory();
  for (const ids of Object.values(build)) {
    for (const id of ids) {
      const needs = materialsFor(getComponent(id));
      for (const key of Object.keys(needs) as ResourceId[]) total[key] += needs[key] ?? 0;
    }
  }
  return total;
}
