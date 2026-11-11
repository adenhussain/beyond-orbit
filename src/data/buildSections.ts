import type { CategoryId, SlotId } from '../types/spacecraft';

/** The nine construction categories shown in the workshop, in build order. */
export interface BuildSection {
  id: string;
  label: string;
  blurb: string;
  slots: SlotId[];
  /** The spacecraft system this belongs to (used to highlight the schematic). */
  category: CategoryId;
}

export const BUILD_SECTIONS: BuildSection[] = [
  { id: 'structure', label: 'Structure', category: 'structure', slots: ['bus'], blurb: 'The frame that survives launch and landing. Heavier frames are stronger but need more fuel.' },
  { id: 'thermal', label: 'Thermal Protection', category: 'structure', slots: ['thermal'], blurb: 'Keeps the cabin and instruments at a survivable temperature.' },
  { id: 'power', label: 'Power Systems', category: 'power', slots: ['generation'], blurb: 'Generation keeps the lights on. Solar output depends on the destination.' },
  { id: 'batteries', label: 'Batteries', category: 'power', slots: ['storage'], blurb: 'Stored energy carries you through darkness and emergencies.' },
  { id: 'propulsion', label: 'Propulsion', category: 'propulsion', slots: ['engine'], blurb: 'Efficiency decides how much fuel you need. Thrust decides whether you can land.' },
  { id: 'fuel', label: 'Fuel Storage', category: 'propulsion', slots: ['tank'], blurb: 'More propellant gives reserve, but it is mass the engine must push.' },
  { id: 'comms', label: 'Communication Systems', category: 'comms', slots: ['antenna', 'backup'], blurb: 'Science that never reaches Earth does not count.' },
  { id: 'avionics', label: 'Navigation and Computers', category: 'computer', slots: ['cpu', 'nav'], blurb: 'The brain and the eyes: what the spacecraft can do without help from Earth.' },
  { id: 'science', label: 'Scientific Instruments', category: 'science', slots: ['instruments'], blurb: 'The reason the mission exists. Up to three instruments.' },
];
