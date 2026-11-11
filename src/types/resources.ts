/** Supplies the astronaut collects on foot before building the spacecraft. */
export type ResourceId =
  | 'structural'
  | 'electronics'
  | 'power'
  | 'fuel'
  | 'thermal'
  | 'comms'
  | 'science'
  | 'repair';

export type Inventory = Record<ResourceId, number>;

export interface ResourceDef {
  id: ResourceId;
  label: string;
  item: string; // name of one collectable unit
  short: string;
  color: number; // used for the in-world sprite
  css: string; // same colour for the React HUD
}

/** Rooms inside the spacecraft. */
export type RoomId = 'lab' | 'comms' | 'command' | 'life' | 'power' | 'engine';
