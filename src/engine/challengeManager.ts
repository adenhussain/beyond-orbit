import { challengesForMission } from '../data/challenges';
import type { Advisory, Challenge, ChallengeOption } from '../types/challenge';
import type { FlightState } from '../types/gameState';
import type { Mission } from '../types/mission';
import { applyRule, cloneState, conditionsHold, pushLog } from './decisionProcessor';

export const CHALLENGE_COUNT = 3;

export function getChallenge(missionId: string, index: number): Challenge {
  const challenge = challengesForMission(missionId)[index];
  if (!challenge) throw new Error(`No challenge ${index} for mission ${missionId}`);
  return challenge;
}

/**
 * Starts a challenge: logs the alert and applies its situation rules
 * (which depend on the design and on earlier decisions). Returns a new state.
 */
export function beginChallenge(input: FlightState, mission: Mission, challenge: Challenge): FlightState {
  const state = cloneState(input);
  pushLog(state, {
    kind: 'situation', severity: 'warn', title: `ALERT: ${challenge.title}`, text: challenge.description,
    tags: [], changes: [], causedByFlags: [], causedByDebts: [],
  });
  for (const rule of challenge.situation) applyRule(state, mission, rule, 'situation');
  return state;
}

/** Flight-director notes for an option, based on the live spacecraft state. */
export function getAdvisories(state: FlightState, mission: Mission, option: ChallengeOption): Advisory[] {
  return option.advisories.filter((a) => conditionsHold(state, mission, a.when));
}

/** Returns the reason an option is unavailable, or null if it can be chosen. */
export function getLockReason(state: FlightState, mission: Mission, option: ChallengeOption): string | null {
  if (option.lockedWhen && conditionsHold(state, mission, option.lockedWhen.when)) {
    return option.lockedWhen.reason;
  }
  return null;
}

/** Situation log entries that fired for the challenge currently on screen. */
export function situationEntries(state: FlightState, challenge: Challenge) {
  const alertIndex = state.log.map((e) => e.title).lastIndexOf(`ALERT: ${challenge.title}`);
  return state.log.slice(alertIndex + 1).filter((e) => e.kind === 'situation');
}
