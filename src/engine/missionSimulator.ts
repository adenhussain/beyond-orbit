import { eventsFor } from '../data/events';
import type { FlightState } from '../types/gameState';
import type { Mission } from '../types/mission';
import type { Build } from '../types/spacecraft';
import type { SpaceWeather } from '../types/spaceWeather';
import { applyEffects, applyRule, cloneState, pushLog } from './decisionProcessor';
import { DEBT_LABEL, calculateBuildStats } from './resourceCalculator';
import { calculateBuildDebt } from './technicalDebt';

const BURN_NAMES = ['mid-course correction', 'arrival manoeuvre', 'powered descent and landing', ''];
const BURN_PHASES = ['Mid-Course Correction', 'Arrival Manoeuvre', 'Powered Descent', ''];

/** Builds the state of the spacecraft at liftoff from the player's design. */
export function createInitialFlightState(
  mission: Mission,
  build: Build,
  repairKits = 0,
  spaceWeather?: SpaceWeather,
): FlightState {
  const stats = calculateBuildStats(build, mission);
  const { debts, contributions } = calculateBuildDebt(build, mission, stats);

  const state: FlightState = {
    missionId: mission.id,
    segmentsFlown: 0,
    progress: 0,
    day: 0,
    phase: 'Launch',
    location: 'Earth',
    fuel: stats.fuelLoaded,
    batteryWh: stats.batteryWh,
    powerGen: stats.powerGen,
    powerDraw: stats.powerDraw,
    commKbps: stats.commKbps,
    scienceMult: 1,
    hull: stats.hullRating,
    oxygen: 100,
    repairKits,
    health: { structure: 100, power: 100, science: 100, comms: 100, propulsion: 100, computer: 100 },
    debt: debts,
    debtLedger: contributions.map((c) => ({ ...c, kind: 'build' as const, day: 0 })),
    flags: [],
    flagOrigins: {},
    log: [],
    specs: {
      compute: stats.compute,
      nav: stats.nav,
      radHard: stats.radHard,
      solar: stats.solar,
      requiredFuel: stats.fuelRequired,
      fuelCapacity: stats.fuelLoaded,
      batteryCapacity: stats.batteryWh,
      storageGB: stats.storageGB,
      sciencePoints: stats.sciencePoints,
      dataGB: stats.dataGeneratedGB,
      twr: stats.twr,
      minTwr: mission.minTwr,
      hullRating: stats.hullRating,
      scienceTarget: mission.scienceTarget,
      commWindowHours: mission.commWindowHours,
    },
  };

  const base = { changes: [], causedByFlags: [], causedByDebts: [] };
  pushLog(state, {
    ...base, kind: 'flight', severity: 'good', title: 'Liftoff',
    text: `${mission.codename} has cleared the tower. Fuelled mass ${Math.round(stats.wetMass)} kg.`, tags: [],
  });
  // Live NASA space weather becomes a fixed part of this mission from launch on.
  if (spaceWeather && spaceWeather.source !== 'offline') {
    state.spaceWeather = spaceWeather;
    state.flags.push(`sw_${spaceWeather.level}`);
    pushLog(state, {
      ...base, kind: 'flight', severity: spaceWeather.level === 'strong' ? 'warn' : 'info',
      title: `Space weather at launch: ${spaceWeather.level.toUpperCase()} (NASA DONKI data)`,
      text: spaceWeather.fastestSpeed !== null
        ? `NASA recorded ${spaceWeather.eventCount} coronal mass ejections in the ${spaceWeather.windowDays} days before launch. Fastest: ${spaceWeather.fastestSpeed} km/s on ${spaceWeather.fastestDate}.`
        : `NASA recorded no coronal mass ejections in the ${spaceWeather.windowDays} days before launch.`,
      tags: [],
    });
  }
  // Record every design weakness so later failures can be traced back to it.
  for (const c of contributions) {
    pushLog(state, {
      ...base, kind: 'build', severity: c.amount >= 20 ? 'warn' : 'info',
      title: `Design weakness: ${DEBT_LABEL[c.debt]} debt +${c.amount}`, text: c.source, tags: [c.debt],
    });
  }
  if (stats.fuelReservePct < 15) {
    pushLog(state, {
      ...base, kind: 'build', severity: 'warn', title: 'Design weakness: thin fuel reserve',
      text: `Launched with ${Math.round(stats.fuelLoaded)} kg of propellant against ${Math.round(stats.fuelRequired)} kg of planned burns (${stats.fuelReservePct.toFixed(0)}% reserve).`,
      tags: ['fuel'],
    });
  }
  if (stats.sciencePoints < stats.scienceTarget) {
    pushLog(state, {
      ...base, kind: 'build', severity: 'warn', title: 'Design weakness: payload below objective',
      text: `Instruments can deliver at most ${stats.sciencePoints} of the ${stats.scienceTarget} science points required.`,
      tags: ['science'],
    });
  }
  if (stats.storageGB < stats.dataGeneratedGB) {
    pushLog(state, {
      ...base, kind: 'build', severity: 'warn', title: 'Design weakness: data storage too small',
      text: `The computer stores ${stats.storageGB} GB but the instruments produce ${stats.dataGeneratedGB} GB.`,
      tags: ['science'],
    });
  }
  if (stats.hullRating < 85) {
    pushLog(state, {
      ...base, kind: 'build', severity: 'info', title: 'Design note: light structure',
      text: `Structural margin is ${stats.hullRating}. There is little allowance for a rough landing.`, tags: ['hull'],
    });
  }
  return state;
}

/**
 * Flies one segment: performs the planned burn, checks hazards caused by
 * technical debt and earlier decisions, then updates the battery.
 * Returns a new state.
 */
export function flySegment(input: FlightState, mission: Mission, segment: number): FlightState {
  const state = cloneState(input);
  const phase = mission.phases[segment];
  state.phase = phase.name;
  state.location = phase.location;
  state.day = mission.segmentDay[segment];
  state.progress = mission.segmentProgress[segment];

  // 1. Planned propulsive manoeuvre.
  const burn = state.specs.requiredFuel * mission.segmentBurn[segment];
  if (burn > 0) {
    const shortfall = burn - state.fuel;
    state.fuel = Math.max(0, state.fuel - burn);
    pushLog(state, {
      kind: 'flight', severity: 'info', title: `Burn complete: ${BURN_NAMES[segment]}`,
      text: `Planned manoeuvre executed. ${Math.round(state.fuel)} kg of propellant remain.`,
      tags: [], changes: [`Fuel −${Math.round(Math.min(burn, burn - shortfall))} kg`],
      causedByFlags: [], causedByDebts: [],
    });
    if (shortfall > 0.5) {
      state.flags.push('fuel_exhausted');
      state.phase = BURN_PHASES[segment]; // it never reached the next phase
      state.location = 'Lost in flight';
      pushLog(state, {
        kind: 'flight', severity: 'crit', title: 'Propellant depleted',
        text: `The tank ran dry ${Math.round(shortfall)} kg short of completing the ${BURN_NAMES[segment]}.`,
        tags: ['fuel'], changes: [], causedByFlags: [], causedByDebts: [],
      });
      state.segmentsFlown = segment + 1;
      return state; // the spacecraft is lost; nothing else can happen
    }
  }

  // 2. Hazards. Each fires only if the design or a past decision set it up.
  for (const event of eventsFor(mission.id, segment)) {
    applyRule(state, mission, event, 'hazard');
  }

  // 3. Battery: trickle-charges with a power surplus, drains with a deficit.
  const capacity = state.specs.batteryCapacity;
  if (state.powerGen >= state.powerDraw) {
    state.batteryWh = Math.min(capacity, state.batteryWh + capacity * 0.05);
  } else {
    const wasEmpty = state.batteryWh <= 0;
    state.batteryWh = Math.max(0, state.batteryWh - capacity * 0.12);
    if (state.batteryWh <= 0 && !wasEmpty) {
      const { changes, tags } = applyEffects(
        state,
        [{ kind: 'science', pct: -10 }, { kind: 'debt', debt: 'power', amount: 10 }, { kind: 'flag', flag: 'battery_flat' }],
        { source: 'Battery depleted by a sustained power deficit', kind: 'event', causeFlags: [] },
      );
      pushLog(state, {
        kind: 'hazard', severity: 'warn', title: 'Battery depleted',
        text: `Demand (${Math.round(state.powerDraw)} W) has exceeded generation (${Math.round(state.powerGen)} W) for too long. The battery is flat and loads are being cut.`,
        tags: [...tags, 'battery'], changes, causedByFlags: [], causedByDebts: ['power'],
      });
    }
  }

  // 4. Life support. Oxygen falls steadily, faster when the ship is in trouble.
  const drain = 8
    + (state.debt.power >= 60 ? 6 : 0)
    + (state.debt.thermal >= 60 ? 6 : 0)
    + (state.hull < 50 ? 8 : 0);
  const before = state.oxygen;
  state.oxygen = Math.max(0, state.oxygen - drain);
  if (before >= 40 && state.oxygen < 40) {
    pushLog(state, {
      kind: 'hazard', severity: 'warn', title: 'Oxygen reserve low',
      text: `Life support is consuming ${drain}% per flight leg. Reserve is down to ${Math.round(state.oxygen)}%.`,
      tags: ['oxygen'], changes: [`Oxygen −${drain}%`], causedByFlags: [],
      causedByDebts: [...(state.debt.power >= 60 ? ['power' as const] : []), ...(state.debt.thermal >= 60 ? ['thermal' as const] : [])],
    });
  }

  state.segmentsFlown = segment + 1;
  return state;
}

/** Cabin temperature in °C, derived from thermal debt (21 °C when there is none). */
export function cabinTemperature(state: FlightState): number {
  return Math.round(21 - state.debt.thermal * 0.38);
}

/**
 * The astronaut services the CO2 scrubbers by hand in the life-support room.
 * Uses one repair kit and restores 20% oxygen. Returns null if not possible.
 */
export function serviceLifeSupport(input: FlightState): FlightState | null {
  if (input.repairKits < 1 || input.oxygen >= 100) return null;
  const state = cloneState(input);
  state.repairKits -= 1;
  const before = state.oxygen;
  state.oxygen = Math.min(100, state.oxygen + 20);
  pushLog(state, {
    kind: 'flight', severity: 'good', title: 'CO2 scrubbers serviced by hand',
    text: 'The astronaut replaced the scrubber cartridge in the life-support room using a repair kit.',
    tags: ['oxygen'], changes: [`Oxygen +${Math.round(state.oxygen - before)}%`, 'Repair kits −1'],
    causedByFlags: [], causedByDebts: [],
  });
  return state;
}
