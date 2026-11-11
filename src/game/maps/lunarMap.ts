import { GROUND_Y, on } from './levelTypes';
import type { LevelMap } from './levelTypes';

const G = on(GROUND_Y);

/**
 * Lunar South Pole staging base. Low gravity: long, floaty jumps.
 * Hazards are cryo-geysers. The rarest supplies sit on the highest platforms.
 */
export const lunarMap: LevelMap = {
  missionId: 'lunar',
  zoneName: 'Shackleton Staging Base',
  width: 5300,
  groundY: GROUND_Y,
  gravity: 620,
  jumpVelocity: -440,
  sky: [0x01030a, 0x0a1220, 0x1a212b, 0x2a323d],
  groundTexture: 'ground_lunar',
  spawnX: 140,
  workshopX: 5050,
  gaps: [{ x: 1500, w: 150 }, { x: 3000, w: 190 }, { x: 4120, w: 160 }],
  platforms: [
    { x: 700, y: 520, w: 200 }, { x: 980, y: 430, w: 180 }, { x: 1270, y: 340, w: 180 },
    { x: 1480, y: 500, w: 190 }, { x: 2100, y: 520, w: 220 }, { x: 2400, y: 420, w: 200 },
    { x: 2940, y: 490, w: 130 }, { x: 3110, y: 400, w: 160 }, { x: 3500, y: 520, w: 240 },
    { x: 3780, y: 420, w: 180 }, { x: 4050, y: 330, w: 180 }, { x: 4500, y: 520, w: 200 },
  ],
  resources: [
    { id: 'l-str1', type: 'structural', x: 350, y: G }, { id: 'l-str2', type: 'structural', x: 1850, y: G },
    { id: 'l-str3', type: 'structural', x: 2540, y: on(420) }, { id: 'l-str4', type: 'structural', x: 3600, y: on(520) },
    { id: 'l-str5', type: 'structural', x: 4350, y: G },
    { id: 'l-elc1', type: 'electronics', x: 780, y: on(520) }, { id: 'l-elc2', type: 'electronics', x: 1060, y: on(430) },
    { id: 'l-elc3', type: 'electronics', x: 2250, y: G }, { id: 'l-elc4', type: 'electronics', x: 3150, y: on(400) },
    { id: 'l-elc5', type: 'electronics', x: 3860, y: on(420) },
    { id: 'l-pwr1', type: 'power', x: 560, y: G }, { id: 'l-pwr2', type: 'power', x: 1310, y: on(340) },
    { id: 'l-pwr3', type: 'power', x: 2180, y: on(520) }, { id: 'l-pwr4', type: 'power', x: 2800, y: G },
    { id: 'l-pwr5', type: 'power', x: 4590, y: on(520) },
    { id: 'l-fue1', type: 'fuel', x: 1570, y: on(500) }, { id: 'l-fue2', type: 'fuel', x: 3350, y: G },
    { id: 'l-fue3', type: 'fuel', x: 4090, y: on(330) },
    { id: 'l-thm1', type: 'thermal', x: 1150, y: G }, { id: 'l-thm2', type: 'thermal', x: 2450, y: on(420) },
    { id: 'l-thm3', type: 'thermal', x: 4750, y: G },
    { id: 'l-com1', type: 'comms', x: 1950, y: G }, { id: 'l-com2', type: 'comms', x: 3000, y: on(490) },
    { id: 'l-com3', type: 'comms', x: 4000, y: G },
    { id: 'l-sci1', type: 'science', x: 900, y: G }, { id: 'l-sci2', type: 'science', x: 2650, y: G },
    { id: 'l-sci3', type: 'science', x: 3720, y: G }, { id: 'l-sci4', type: 'science', x: 4180, y: on(330) },
    { id: 'l-rep1', type: 'repair', x: 1400, y: on(340) }, { id: 'l-rep2', type: 'repair', x: 3230, y: on(400) },
  ],
  vents: [{ x: 1230, period: 2600 }, { x: 2330, period: 3200 }, { x: 3440, period: 2400 }, { x: 4440, period: 2900 }],
  devils: [],
  o2Stations: [2020, 3900],
};
