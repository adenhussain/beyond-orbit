import { SLOTS, getComponent } from '../data/spacecraftComponents';
import type { Build } from '../types/spacecraft';

export type ToggleAction = 'add' | 'remove' | 'replace' | 'full';

/** What clicking a component would do to the current design. */
export function toggleAction(build: Build, componentId: string): ToggleAction {
  const component = getComponent(componentId);
  const slot = SLOTS.find((s) => s.id === component.slot)!;
  const fitted = build[slot.id];
  if (fitted.includes(componentId)) return 'remove';
  if (slot.max === 1) return fitted.length > 0 ? 'replace' : 'add';
  return fitted.length < slot.max ? 'add' : 'full';
}

/** Returns a new design with the component added, removed or swapped in. */
export function toggleComponent(build: Build, componentId: string): Build {
  const component = getComponent(componentId);
  const fitted = build[component.slot];
  switch (toggleAction(build, componentId)) {
    case 'remove':
      return { ...build, [component.slot]: fitted.filter((id) => id !== componentId) };
    case 'replace':
      return { ...build, [component.slot]: [componentId] };
    case 'add':
      return { ...build, [component.slot]: [...fitted, componentId] };
    case 'full':
      return build;
  }
}
