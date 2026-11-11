import type { CriticalFailure, FlightState, MissionOutcome } from '../types/gameState';
import type { Mission } from '../types/mission';

/**
 * Failures that end the mission. `final` adds the checks that only apply
 * once the spacecraft has finished its surface operations.
 */
export function findCriticals(state: FlightState, final: boolean): CriticalFailure[] {
  const criticals: CriticalFailure[] = [];
  if (state.flags.includes('fuel_exhausted')) {
    criticals.push({
      domain: 'fuel', title: 'Propellant exhausted',
      detail: `The spacecraft ran out of propellant during ${state.phase.toLowerCase()} and could not complete its manoeuvres.`,
    });
  }
  if (state.hull <= 0) {
    criticals.push({
      domain: 'hull', title: 'Structural failure',
      detail: 'Accumulated damage exceeded the structural margin of the spacecraft bus.',
    });
  }
  if (state.health.computer <= 20) {
    criticals.push({
      domain: 'computer', title: 'Flight computer lost',
      detail: `Computer health fell to ${Math.round(state.health.computer)}%. The spacecraft stopped responding to commands.`,
    });
  }
  if (state.oxygen <= 0) {
    criticals.push({
      domain: 'oxygen', title: 'Life support exhausted',
      detail: 'The cabin oxygen reserve reached zero. The astronaut could not continue the mission.',
    });
  }
  if (final) {
    if (state.debt.thermal >= 95) {
      criticals.push({
        domain: 'thermal', title: 'Thermal failure',
        detail: 'Thermal debt reached a critical level. Electronics dropped below survival temperature and did not restart.',
      });
    }
    if (state.batteryWh <= 0 && state.powerGen < state.powerDraw * 0.6) {
      criticals.push({
        domain: 'power', title: 'Power system collapse',
        detail: `With a flat battery and only ${Math.round(state.powerGen)} W generated against ${Math.round(state.powerDraw)} W demand, the power bus could not be sustained.`,
      });
    }
  }
  return criticals;
}

/**
 * Calculates the final result from the simulation state only.
 * Nothing here is random: the same state always gives the same outcome.
 */
export function evaluateOutcome(state: FlightState, mission: Mission): MissionOutcome {
  const missionFinished = state.segmentsFlown >= 4;
  const criticals = findCriticals(state, missionFinished);
  const lostInFlight = criticals.length > 0 && !missionFinished;

  // --- Science chain: instruments -> storage -> downlink ---
  const potential = state.specs.sciencePoints;
  const instrumentHealth = state.health.science / 100;
  let collected = potential * state.scienceMult * instrumentHealth;
  let dataGenerated = state.specs.dataGB * state.scienceMult * instrumentHealth;
  if (lostInFlight) {
    collected = 0; // lost before reaching the science site
    dataGenerated = 0;
  } else if (criticals.length > 0) {
    collected *= 0.4; // died partway through surface operations
    dataGenerated *= 0.4;
  }
  const dataStored = Math.min(dataGenerated, state.specs.storageGB);
  const downlinkCapacity =
    ((state.commKbps * 3600 * state.specs.commWindowHours) / 8e6) * (state.health.comms / 100);
  const dataReturned = Math.min(dataStored, downlinkCapacity);
  const returned = dataGenerated > 0 ? collected * (dataReturned / dataGenerated) : 0;
  const sciencePct = (returned / mission.scienceTarget) * 100;

  if (criticals.length === 0 && sciencePct < 50) {
    criticals.push({
      domain: 'science', title: 'Science objective not met',
      detail: `Only ${returned.toFixed(0)} of ${mission.scienceTarget} required science points reached Earth (${Math.floor(sciencePct)}%).`,
    });
  }

  let result: MissionOutcome['result'];
  if (criticals.length > 0) result = 'failure';
  else if (sciencePct >= 100 && state.hull >= 40) result = 'success';
  else result = 'partial';

  // --- Reasons, taken straight from the simulation log ---
  const reasons: MissionOutcome['reasons'] = [];
  for (const c of criticals) reasons.push({ tone: 'crit', text: `${c.title}: ${c.detail}` });
  if (!lostInFlight) {
    reasons.push({
      tone: sciencePct >= 100 ? 'good' : sciencePct >= 50 ? 'warn' : 'crit',
      text: `Science returned: ${returned.toFixed(0)} of ${mission.scienceTarget} points (${Math.floor(sciencePct)}% of objective). Instruments could have produced ${potential}.`,
    });
    if (dataStored < dataGenerated - 0.05) {
      reasons.push({ tone: 'warn', text: `Storage limit: ${(dataGenerated - dataStored).toFixed(1)} GB of data was overwritten before it could be sent.` });
    }
    if (dataReturned < dataStored - 0.05) {
      reasons.push({ tone: 'warn', text: `Downlink limit: only ${dataReturned.toFixed(1)} of ${dataStored.toFixed(1)} GB could be transmitted at ${Math.round(state.commKbps)} kbps.` });
    }
    if (result === 'partial' && sciencePct >= 100) {
      reasons.push({ tone: 'warn', text: `Structural margin ended at ${Math.round(state.hull)} — the lander was too damaged for a full-success rating.` });
    }
  }
  for (const entry of state.log) {
    if (entry.kind !== 'hazard' && entry.kind !== 'decision') continue;
    if (entry.severity === 'info') continue;
    reasons.push({
      tone: entry.severity === 'good' ? 'good' : entry.severity === 'crit' ? 'crit' : 'warn',
      text: `Day ${entry.day} — ${entry.title}${entry.changes.length ? ` (${entry.changes.join(', ')})` : ''}`,
    });
  }

  const headline =
    result === 'success' ? 'COMPLETE SUCCESS' : result === 'partial' ? 'PARTIAL SUCCESS' : 'MISSION FAILURE';
  const summary =
    result === 'success'
      ? `All primary objectives achieved. ${dataReturned.toFixed(1)} GB of science data reached Earth.`
      : result === 'partial'
        ? `The spacecraft survived and returned ${Math.floor(sciencePct)}% of the science objective.`
        : criticals[0].detail;

  return {
    result, headline, summary, criticals, reasons,
    sciencePotential: potential,
    scienceCollected: collected,
    scienceReturned: returned,
    scienceTarget: mission.scienceTarget,
    sciencePct,
    dataGeneratedGB: dataGenerated,
    dataStoredGB: dataStored,
    dataReturnedGB: dataReturned,
    downlinkCapacityGB: downlinkCapacity,
    final: {
      fuel: state.fuel,
      fuelPct: state.specs.fuelCapacity > 0 ? (state.fuel / state.specs.fuelCapacity) * 100 : 0,
      batteryPct: state.specs.batteryCapacity > 0 ? (state.batteryWh / state.specs.batteryCapacity) * 100 : 0,
      hull: state.hull,
      oxygen: state.oxygen,
      powerGen: state.powerGen,
      powerDraw: state.powerDraw,
      commKbps: state.commKbps,
      debt: { ...state.debt },
      health: { ...state.health },
    },
  };
}
