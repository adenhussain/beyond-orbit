import { GROUND_Y, on } from './levelTypes';
import type { LevelMap } from './levelTypes';

const G = on(GROUND_Y);

/**
 * Mars forward depot. Heavier gravity: shorter jumps, and more of them.
 * Hazards are roaming dust devils. Thermal insulation is scarce here.
 */
export const marsMap: LevelMap = {
  missionId: 'mars',
  zoneName: 'Arcadia Forward Depot',
  width: 5700,
  groundY: GROUND_Y,
  gravity: 980,
  jumpVelocity: -500,
  sky: [0x2a1410, 0xa8603c, 0x6e3320, 0x7d3a22],
  groundTexture: 'ground_mars',
  spawnX: 140,
  workshopX: 5450,
  gaps: [{ x: 1100, w: 160 }, { x: 2500, w: 130 }, { x: 2700, w: 130 }, { x: 4300, w: 200 }],
  platforms: [
    { x: 500, y: 520, w: 180 }, { x: 780, y: 430, w: 170 }, { x: 1070, y: 500, w: 230 },
    { x: 1600, y: 520, w: 200 }, { x: 1880, y: 420, w: 180 }, { x: 2140, y: 330, w: 200 },
    { x: 2450, y: 500, w: 130 }, { x: 2630, y: 420, w: 110 }, { x: 2810, y: 500, w: 130 },
    { x: 3300, y: 520, w: 260 }, { x: 3620, y: 430, w: 170 }, { x: 3890, y: 340, w: 220 },
    { x: 4250, y: 510, w: 130 }, { x: 4410, y: 440, w: 130 }, { x: 4800, y: 520, w: 220 },
  ],
  resources: [
    { id: 'm-str1', type: 'structural', x: 320, y: G }, { id: 'm-str2', type: 'structural', x: 1420, y: G },
    { id: 'm-str3', type: 'structural', x: 1700, y: on(520) }, { id: 'm-str4', type: 'structural', x: 3100, y: G },
    { id: 'm-str5', type: 'structural', x: 4700, y: G },
    { id: 'm-elc1', type: 'electronics', x: 590, y: on(520) }, { id: 'm-elc2', type: 'electronics', x: 860, y: on(430) },
    { id: 'm-elc3', type: 'electronics', x: 1970, y: on(420) }, { id: 'm-elc4', type: 'electronics', x: 3400, y: on(520) },
    { id: 'm-elc5', type: 'electronics', x: 3740, y: on(430) }, { id: 'm-elc6', type: 'electronics', x: 5050, y: G },
    { id: 'm-pwr1', type: 'power', x: 720, y: G }, { id: 'm-pwr2', type: 'power', x: 1180, y: on(500) },
    { id: 'm-pwr3', type: 'power', x: 2290, y: on(330) }, { id: 'm-pwr4', type: 'power', x: 2880, y: on(500) },
    { id: 'm-pwr5', type: 'power', x: 3990, y: on(340) }, { id: 'm-pwr6', type: 'power', x: 4900, y: on(520) },
    { id: 'm-fue1', type: 'fuel', x: 2050, y: G }, { id: 'm-fue2', type: 'fuel', x: 3930, y: on(340) },
    { id: 'm-fue3', type: 'fuel', x: 4470, y: on(440) },
    { id: 'm-thm1', type: 'thermal', x: 1320, y: G }, { id: 'm-thm2', type: 'thermal', x: 4060, y: on(340) },
    { id: 'm-com1', type: 'comms', x: 960, y: G }, { id: 'm-com2', type: 'comms', x: 2510, y: on(500) },
    { id: 'm-com3', type: 'comms', x: 3520, y: G }, { id: 'm-com4', type: 'comms', x: 4310, y: on(510) },
    { id: 'm-sci1', type: 'science', x: 2330, y: G }, { id: 'm-sci2', type: 'science', x: 2685, y: on(420) },
    { id: 'm-sci3', type: 'science', x: 3200, y: G }, { id: 'm-sci4', type: 'science', x: 4620, y: G },
    { id: 'm-rep1', type: 'repair', x: 2190, y: on(330) }, { id: 'm-rep2', type: 'repair', x: 3660, y: on(430) },
    { id: 'm-rep3', type: 'repair', x: 5150, y: G },
  ],
  vents: [],
  devils: [
    { from: 1300, to: 2000, duration: 5200 },
    { from: 2950, to: 3600, duration: 4400 },
    { from: 4560, to: 5250, duration: 4800 },
  ],
  o2Stations: [2380, 3830],
};
