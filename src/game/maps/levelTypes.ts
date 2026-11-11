import type { ResourceId } from '../../types/resources';

/** A side-scrolling exploration level, described as plain data. */
export interface LevelMap {
  missionId: string;
  zoneName: string;
  width: number;
  groundY: number;
  gravity: number;
  jumpVelocity: number;
  /** Colours: sky top, sky bottom, far hills, near hills. */
  sky: [number, number, number, number];
  groundTexture: string;
  spawnX: number;
  workshopX: number;
  /** Holes in the ground. Falling in damages the suit. */
  gaps: { x: number; w: number }[];
  /** Metal platforms; y is the top surface. */
  platforms: { x: number; y: number; w: number }[];
  /** Collectable supplies. y is the centre of the item. */
  resources: { id: string; type: ResourceId; x: number; y: number }[];
  /** Geysers that erupt on a timer (period in ms). */
  vents: { x: number; period: number }[];
  /** Dust devils that patrol between two x positions. */
  devils: { from: number; to: number; duration: number }[];
  /** Oxygen refill stations (x positions on the ground). */
  o2Stations: number[];
}

export const GROUND_Y = 620;
/** y for an item resting on the ground or on a platform whose top is `top`. */
export const on = (top: number) => top - 26;
