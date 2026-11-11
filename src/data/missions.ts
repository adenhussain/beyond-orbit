import type { Mission } from '../types/mission';

/**
 * Mission catalogue. To add a mission: add an entry here, then add its three
 * challenges in challenges.ts and its hazards in events.ts.
 * Numbers are simplified for teaching purposes, not flight-certified values.
 */
export const MISSIONS: Mission[] = [
  {
    id: 'lunar',
    name: 'Lunar South Pole Mission',
    codename: 'OP. SILVER SHADOW',
    destination: 'Moon — Shackleton Crater Rim',
    objective:
      'Land at the lunar south pole and survey permanently shadowed terrain for water ice.',
    difficulty: 'HARD',
    durationDays: 14,
    durationLabel: '14 days',
    environment: [
      'Surface temperatures from +120 °C in sunlight to -230 °C in shadow',
      'Sun sits on the horizon: solar arrays deliver about 70% output',
      'Boulder-strewn crater rim with long shadows hides landing hazards',
      'Earth is low on the horizon: the downlink is easily interrupted',
    ],
    requiredCapabilities: [
      'Thermal protection rating 70 or higher',
      'Propulsion for orbit insertion and a powered landing',
      'Battery reserve for 14 hours of shadow',
      'At least one science instrument (Neutron Ice Detector recommended)',
    ],
    briefing: [
      'Commander, water ice at the lunar poles could supply future crews with drinking water, oxygen and rocket propellant. Nobody has measured it on the ground. You will.',
      'Your lander must coast three days to the Moon, brake into polar orbit, then descend to the rim of Shackleton crater where sunlight grazes the horizon and the shadows never lift.',
      'The cold is your main enemy. Power is the second. Design the spacecraft with margin, because whatever you leave out on the ground you will pay for in flight.',
    ],
    requiredComponents: [],
    keyInstruments: ['sci_neutron', 'sci_drill'],
    budget: 230,
    maxLaunchMass: 2000,
    fuelFactor: 0.8,
    solarFactor: 0.7,
    commFactor: 1,
    commWindowHours: 40,
    thermalDemand: 70,
    nightHours: 14,
    gravity: 1.62,
    minTwr: 1.5,
    scienceTarget: 75,
    phases: [
      { name: 'Trans-Lunar Coast', location: '182,000 km from Earth' },
      { name: 'Lunar Polar Orbit', location: '100 km above the lunar surface' },
      { name: 'Surface Operations', location: 'Shackleton crater rim, 89.9° S' },
      { name: 'Science Return', location: 'Lunar south pole' },
    ],
    segmentBurn: [0.05, 0.35, 0.6, 0],
    segmentProgress: [25, 55, 80, 100],
    segmentDay: [2, 5, 9, 14],
  },
  {
    id: 'mars',
    name: 'Mars Sample Collection Mission',
    codename: 'OP. RED HARVEST',
    destination: 'Mars — Ancient River Delta',
    objective:
      'Land on Mars, drill and cache rock samples, and transmit the science data to Earth.',
    difficulty: 'EXTREME',
    durationDays: 240,
    durationLabel: '8 months',
    environment: [
      'Signals take up to 14 minutes each way: landing must be autonomous',
      'Sunlight is 45% of Earth level and dust storms cut it further',
      'Seven months of deep-space radiation on unprotected electronics',
      'Direct-to-Earth data rates fall to about 12% of the reference rate',
    ],
    requiredCapabilities: [
      'Sample Drill & Cache System (mandatory payload)',
      'Radiation-tolerant flight computer strongly advised',
      'Navigation able to land without help from Earth',
      'Downlink capacity for the full science data set',
    ],
    briefing: [
      'Commander, three and a half billion years ago a river emptied into this crater. If Mars ever hosted life, its traces are locked in that delta mud. Your job is to drill it and tell Earth what you find.',
      'The cruise lasts seven months. During entry, descent and landing your spacecraft will be on its own: by the time Earth hears you have hit the atmosphere, you will already be on the ground, one way or another.',
      'Reliability beats raw performance out here. Every component you select has to work for 240 days with nobody able to touch it.',
    ],
    requiredComponents: ['sci_drill'],
    keyInstruments: ['sci_drill', 'sci_spec'],
    budget: 260,
    maxLaunchMass: 1950,
    fuelFactor: 0.82,
    solarFactor: 0.45,
    commFactor: 0.12,
    commWindowHours: 120,
    thermalDemand: 55,
    nightHours: 12,
    gravity: 1.67, // Mars gravity reduced by parachute assistance
    minTwr: 1.5,
    scienceTarget: 75,
    phases: [
      { name: 'Interplanetary Cruise', location: '0.4 AU from Earth' },
      { name: 'Mars Approach', location: '2.1 million km from Mars' },
      { name: 'Surface Operations', location: 'River delta, 18° N' },
      { name: 'Data Return', location: 'Mars surface' },
    ],
    segmentBurn: [0.1, 0.25, 0.65, 0],
    segmentProgress: [25, 55, 80, 100],
    segmentDay: [96, 205, 222, 240],
  },
];

export function getMission(id: string): Mission {
  const mission = MISSIONS.find((m) => m.id === id);
  if (!mission) throw new Error(`Unknown mission: ${id}`);
  return mission;
}
