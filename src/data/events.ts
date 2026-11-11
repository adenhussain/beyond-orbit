import type { PassiveEvent } from '../types/challenge';

/**
 * Hazards checked automatically while the spacecraft flies each segment.
 * They never fire at random: each one needs a condition created by the
 * spacecraft design (technical debt) or by an earlier decision (a flag).
 * This is the Butterfly Effect.
 *
 * Segment 0 = launch to challenge 1, 1 = to challenge 2, 2 = to challenge 3
 * (includes the landing), 3 = final surface operations.
 */
export const PASSIVE_EVENTS: PassiveEvent[] = [
  // ---------------- LUNAR ----------------
  {
    id: 'lunar_valve', missionId: 'lunar', segment: 0,
    when: [{ stat: 'debt.reliability', gte: 50 }],
    effects: [{ kind: 'fuel', pctOfRequired: -5 }],
    title: 'Thruster valve stuck open',
    narrative: 'A low-grade thruster valve stuck during the mid-course burn. Extra propellant was spent correcting the error.',
    severity: 'warn',
  },
  {
    id: 'lunar_hardland', missionId: 'lunar', segment: 2,
    when: [{ stat: 'twrMargin', lt: 0 }],
    effects: [{ kind: 'hull', amount: -30 }, { kind: 'health', system: 'structure', amount: -20 }],
    title: 'Hard landing — insufficient thrust',
    narrative: 'The engine could not slow the lander enough in the final seconds. It hit the surface at 6 m/s and bent a landing leg.',
    severity: 'crit',
  },
  {
    id: 'lunar_nomap_bad', missionId: 'lunar', segment: 2,
    when: [{ flag: 'no_map' }, { stat: 'nav', lt: 80 }],
    effects: [
      { kind: 'hull', amount: -25 },
      { kind: 'science', pct: -15 },
      { kind: 'flag', flag: 'offtarget' },
    ],
    title: 'Off-target landing on a shadowed slope',
    narrative: 'Without the hazard map the navigation sensors missed a boulder field. The lander diverted late and set down 2 km off target on a slope in partial shadow.',
    severity: 'crit',
  },
  {
    id: 'lunar_nomap_ok', missionId: 'lunar', segment: 2,
    when: [{ flag: 'no_map' }, { stat: 'nav', gte: 80 }],
    effects: [],
    title: 'Autonomous hazard avoidance successful',
    narrative: 'With no map from Earth, the lidar scanned the rim, rejected two boulder fields and set down on target.',
    severity: 'good',
  },
  {
    id: 'lunar_map_ok', missionId: 'lunar', segment: 2,
    when: [{ flag: 'map_uploaded' }, { stat: 'twrMargin', gte: 0 }],
    effects: [],
    title: 'Touchdown on target',
    narrative: 'Guided by the uploaded hazard map, the lander touched down within 40 m of the planned site in direct sunlight.',
    severity: 'good',
  },
  {
    id: 'lunar_coldsoak', missionId: 'lunar', segment: 3,
    when: [{ stat: 'debt.thermal', gte: 60 }],
    effects: [{ kind: 'health', system: 'science', amount: -35 }, { kind: 'science', pct: -20 }],
    title: 'Instruments cold-soaked',
    narrative: 'Instrument electronics fell below survival temperature in the polar shadow. Two detectors returned noise instead of data.',
    severity: 'crit',
  },
  {
    id: 'lunar_undervolt', missionId: 'lunar', segment: 3,
    when: [{ stat: 'debt.power', gte: 60 }],
    effects: [{ kind: 'science', pct: -15 }],
    title: 'Undervoltage resets',
    narrative: 'Repeated bus undervoltage reset the payload controller and interrupted science sequences.',
    severity: 'warn',
  },
  {
    id: 'lunar_dropouts', missionId: 'lunar', segment: 3,
    when: [{ stat: 'debt.comm', gte: 60 }],
    effects: [{ kind: 'comm', pct: -30 }],
    title: 'Downlink dropouts',
    narrative: 'With Earth low on the polar horizon, the weak link dropped out behind terrain for hours at a time.',
    severity: 'warn',
  },
  {
    id: 'lunar_actuator', missionId: 'lunar', segment: 3,
    when: [{ stat: 'debt.reliability', gte: 55 }],
    effects: [{ kind: 'health', system: 'science', amount: -15 }, { kind: 'science', pct: -10 }],
    title: 'Instrument actuator seized',
    narrative: 'A low-grade actuator seized in the cold and left one instrument pointing at the sky.',
    severity: 'warn',
  },

  // ---------------- MARS ----------------
  {
    id: 'mars_valve', missionId: 'mars', segment: 0,
    when: [{ stat: 'debt.reliability', gte: 50 }],
    effects: [{ kind: 'fuel', pctOfRequired: -5 }],
    title: 'Thruster valve leak',
    narrative: 'A low-grade thruster valve leaked during early cruise. Propellant was lost before it could be isolated.',
    severity: 'warn',
  },
  {
    id: 'mars_dose', missionId: 'mars', segment: 1,
    when: [{ stat: 'radHard', lt: 50 }],
    effects: [{ kind: 'health', system: 'computer', amount: -15 }, { kind: 'debt', debt: 'reliability', amount: 10 }],
    title: 'Cumulative radiation dose',
    narrative: 'Seven months of cosmic rays have degraded the unhardened flight computer. It now reboots about once a week.',
    severity: 'warn',
  },
  {
    id: 'mars_hardland_thrust', missionId: 'mars', segment: 2,
    when: [{ stat: 'twrMargin', lt: 0 }],
    effects: [{ kind: 'hull', amount: -30 }, { kind: 'health', system: 'structure', amount: -20 }],
    title: 'Hard landing — insufficient thrust',
    narrative: 'After parachute release the engine could not stop the descent in time. The lander struck at 7 m/s.',
    severity: 'crit',
  },
  {
    id: 'mars_backup_ok', missionId: 'mars', segment: 2,
    when: [{ flag: 'backup_site' }],
    effects: [],
    title: 'Touchdown on the plain',
    narrative: 'The lander set down on smooth ground with Earth in view. Landing telemetry was received 14 minutes later.',
    severity: 'good',
  },
  {
    id: 'mars_primary_good', missionId: 'mars', segment: 2,
    when: [{ flag: 'primary_site' }, { stat: 'nav', gte: 80 }, { stat: 'health.computer', gte: 70 }],
    effects: [],
    title: 'Precision landing in the delta',
    narrative: 'Terrain-relative navigation matched the delta in six seconds, steered around a dune field and landed 30 m from the target outcrop.',
    severity: 'good',
  },
  {
    id: 'mars_primary_rough', missionId: 'mars', segment: 2,
    when: [{ flag: 'primary_site' }, { stat: 'nav', gte: 55 }, { stat: 'nav', lt: 80 }, { stat: 'health.computer', gte: 70 }],
    effects: [{ kind: 'hull', amount: -20 }, { kind: 'health', system: 'science', amount: -15 }],
    title: 'Rough landing in a rock field',
    narrative: 'Unable to see hazards, the lander came down 600 m long in a rock field. One leg sits on a boulder and the deck is tilted 9°, limiting the drill angle.',
    severity: 'warn',
  },
  {
    id: 'mars_primary_blind', missionId: 'mars', segment: 2,
    when: [{ flag: 'primary_site' }, { stat: 'nav', lt: 55 }, { stat: 'health.computer', gte: 70 }],
    effects: [
      { kind: 'hull', amount: -45 },
      { kind: 'health', system: 'science', amount: -30 },
      { kind: 'science', pct: -20 },
      { kind: 'flag', flag: 'hard_landing' },
    ],
    title: 'Hard landing — blind descent',
    narrative: 'Inertial sensors alone could not find the ground accurately. The lander hit a rock ledge hard, bending the drill mast and crushing an instrument.',
    severity: 'crit',
  },
  {
    id: 'mars_primary_cpu', missionId: 'mars', segment: 2,
    when: [{ flag: 'primary_site' }, { stat: 'health.computer', lt: 70 }],
    effects: [
      { kind: 'hull', amount: -45 },
      { kind: 'health', system: 'science', amount: -30 },
      { kind: 'science', pct: -20 },
      { kind: 'flag', flag: 'hard_landing' },
    ],
    title: 'Hard landing — computer reset during descent',
    narrative: 'The radiation-damaged computer rebooted 40 seconds before touchdown. Guidance recovered too late and the lander hit hard, bending the drill mast.',
    severity: 'crit',
  },
  {
    id: 'mars_nightcold', missionId: 'mars', segment: 3,
    when: [{ stat: 'debt.thermal', gte: 60 }],
    effects: [{ kind: 'battery', pctOfCapacity: -20 }, { kind: 'science', pct: -15 }],
    title: 'Night-time cold drains the battery',
    narrative: 'At -90 °C the under-insulated lander burned battery energy on survival heating, cutting each working day short.',
    severity: 'warn',
  },
  {
    id: 'mars_undervolt', missionId: 'mars', segment: 3,
    when: [{ stat: 'debt.power', gte: 60 }],
    effects: [{ kind: 'science', pct: -15 }],
    title: 'Undervoltage resets',
    narrative: 'The power bus sagged every afternoon, resetting the payload controller mid-analysis.',
    severity: 'warn',
  },
  {
    id: 'mars_dropouts', missionId: 'mars', segment: 3,
    when: [{ stat: 'debt.comm', gte: 60 }],
    effects: [{ kind: 'comm', pct: -30 }],
    title: 'Missed downlink passes',
    narrative: 'With no margin in the link, dust attenuation and pointing errors caused whole communication passes to be lost.',
    severity: 'warn',
  },
  {
    id: 'mars_actuator', missionId: 'mars', segment: 3,
    when: [{ stat: 'debt.reliability', gte: 55 }],
    effects: [{ kind: 'health', system: 'science', amount: -15 }, { kind: 'science', pct: -10 }],
    title: 'Sample carousel jammed',
    narrative: 'A low-grade motor in the sample carousel jammed, and one sample tube could not be sealed.',
    severity: 'warn',
  },
];

export function eventsFor(missionId: string, segment: number): PassiveEvent[] {
  return PASSIVE_EVENTS.filter((e) => e.missionId === missionId && e.segment === segment);
}
