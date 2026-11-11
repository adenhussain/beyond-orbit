import type { RoomId } from '../../types/resources';

export interface RoomDef {
  id: RoomId;
  name: string;
  /** What the console in this room controls. */
  console: string;
  x: number;
  w: number;
  wall: number; // back-wall colour
  accent: number;
}

export const SHIP = {
  floorY: 560,
  ceilingY: 250,
  startX: 120,
  roomW: 620,
  gravity: 900,
  jumpVelocity: -400,
};

const room = (index: number, id: RoomId, name: string, consoleName: string, wall: number, accent: number): RoomDef => ({
  id, name, console: consoleName, x: SHIP.startX + index * SHIP.roomW, w: SHIP.roomW, wall, accent,
});

/** Rooms from the nose (left) to the engines (right), joined by doors. */
export const ROOMS: RoomDef[] = [
  room(0, 'lab', 'Science Laboratory', 'Payload Console', 0x1a1830, 0xc48bff),
  room(1, 'comms', 'Communication Room', 'Antenna Control', 0x10202c, 0x74d4ff),
  room(2, 'command', 'Command Room', 'Mission Control', 0x101c2a, 0x5dfc9a),
  room(3, 'life', 'Life Support Room', 'Life-Support Panel', 0x10241f, 0x7dffd0),
  room(4, 'power', 'Power Room', 'Power Distribution', 0x26200f, 0xffd447),
  room(5, 'engine', 'Engine Room', 'Propulsion Console', 0x2a1612, 0xff7a45),
];

export const SHIP_WIDTH = SHIP.startX * 2 + ROOMS.length * SHIP.roomW;

export function getRoom(id: RoomId): RoomDef {
  return ROOMS.find((r) => r.id === id)!;
}

export function roomAt(x: number): RoomDef {
  return ROOMS.find((r) => x >= r.x && x < r.x + r.w) ?? (x < SHIP.startX ? ROOMS[0] : ROOMS[ROOMS.length - 1]);
}
