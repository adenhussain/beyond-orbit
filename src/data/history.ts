/**
 * "THIS REALLY HAPPENED" — the real spaceflight events each in-game
 * challenge is based on. Shown to the player after they decide, so they can
 * compare their choice with what real mission teams did.
 *
 * Keep these short and factual. Each entry names its event so it can be
 * checked against public NASA / agency records.
 */
export interface HistoryCard {
  mission: string;
  year: string;
  title: string;
  happened: string;
  lesson: string;
}

export const HISTORY: Record<string, HistoryCard> = {
  lunar_coolant: {
    mission: 'Soyuz MS-22 at the International Space Station',
    year: '2022',
    title: 'A coolant leak in orbit',
    happened:
      'In December 2022 the Soyuz MS-22 spacecraft docked to the ISS sprayed its coolant into space after a small impact, most likely a micrometeoroid, punctured its external radiator. Engineers judged that without that cooling loop the capsule could overheat on the way home with crew aboard. An uncrewed replacement, Soyuz MS-23, was launched to bring the crew back.',
    lesson: 'Losing a cooling loop does not destroy a spacecraft immediately, but it removes the margin you need later.',
  },
  lunar_antenna: {
    mission: 'Galileo (NASA, Jupiter)',
    year: '1991',
    title: 'The antenna that never opened',
    happened:
      "Galileo's large high-gain antenna jammed while unfolding on the way to Jupiter. The team switched to the small low-gain antenna, which was thousands of times slower, and sent new software that compressed the data. Galileo still returned most of its planned science.",
    lesson: 'When bandwidth is lost, smarter software and careful choices about which data to send can save a mission.',
  },
  lunar_power: {
    mission: 'Apollo 13 (NASA)',
    year: '1970',
    title: 'Power-down to survive',
    happened:
      "After an oxygen tank exploded on the way to the Moon, Apollo 13's crew and Mission Control switched off almost every system in the spacecraft to stretch the remaining power and water. Experiments and comfort were sacrificed so the crew could get home safely.",
    lesson: 'Shedding non-essential loads early keeps the critical systems alive.',
  },
  mars_storm: {
    mission: 'Mars Odyssey (NASA)',
    year: '2003',
    title: 'The Halloween solar storms',
    happened:
      "In late October 2003 a series of powerful solar eruptions hit the inner solar system. Spacecraft across the solar system went into protective safe modes. Mars Odyssey's radiation instrument, MARIE, stopped working during the storms and never recovered.",
    lesson: 'Radiation can permanently damage electronics; hardened parts and protective safe modes exist for this reason.',
  },
  mars_relay: {
    mission: 'Perseverance (NASA, Jezero crater)',
    year: '2021',
    title: 'Landing where it was too dangerous to land',
    happened:
      "Jezero crater's ancient river delta was the most scientifically interesting site, but it was full of cliffs, boulders and sand. Perseverance landed there safely because of Terrain-Relative Navigation: during descent it photographed the ground, matched the images to a map and steered itself to a safe spot, with no help from Earth.",
    lesson: 'Better onboard navigation lets a spacecraft reach the places worth exploring.',
  },
  mars_drill: {
    mission: 'InSight (NASA, Mars)',
    year: '2019–2022',
    title: 'Stuck in the ground, dimmed by dust',
    happened:
      "InSight's heat-flow probe, nicknamed \"the mole\", was designed to hammer itself 5 metres into Mars but could not grip the unexpectedly clumpy soil. After nearly two years of attempts it was retired. Dust slowly covered InSight's solar panels until the lander ran out of power in December 2022.",
    lesson: 'The ground and the weather on another planet can defeat even well-tested hardware; power margin buys time.',
  },
};
