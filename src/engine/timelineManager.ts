import type { Mission } from '../types/mission';
import type { Build } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';
import { CHALLENGE_COUNT, beginChallenge, getChallenge, getLockReason } from './challengeManager';
import { applyDecision, cloneState } from './decisionProcessor';
import { createInitialFlightState, flySegment, serviceLifeSupport } from './missionSimulator';
import { evaluateOutcome, findCriticals } from './outcomeEvaluator';

/**
 * THE TIME MACHINE.
 * A timeline is one complete run of history. Every function here returns a
 * NEW timeline object and never edits the one passed in, so older timelines
 * are preserved exactly as they were.
 */

const NAMES = ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA', 'ECHO', 'FOXTROT', 'GOLF', 'HOTEL', 'INDIA', 'JULIET', 'KILO', 'LIMA'];

export function timelineName(index: number): string {
  return index < NAMES.length ? NAMES[index] : `BRANCH-${index + 1}`;
}

export function createOriginalTimeline(mission: Mission, build: Build, repairKits = 0): Timeline {
  return {
    id: 'tl-1',
    name: timelineName(0),
    parentId: null,
    parentName: null,
    branchedAtChallenge: null,
    lockedOption: null,
    stage: 'cruise',
    challengeIndex: 0,
    state: createInitialFlightState(mission, build, repairKits),
    snapshots: [],
    decisions: [],
    outcome: null,
  };
}

/** The spacecraft reaches the next decision point, or the end of the mission. */
export function arriveAtNextPoint(timeline: Timeline, mission: Mission): Timeline {
  if (timeline.stage !== 'cruise') return timeline;
  const flown = flySegment(timeline.state, mission, timeline.challengeIndex);

  const lost = findCriticals(flown, false).length > 0;
  if (lost || timeline.challengeIndex >= CHALLENGE_COUNT) {
    return { ...timeline, state: flown, stage: 'complete', outcome: evaluateOutcome(flown, mission) };
  }

  const challenge = getChallenge(mission.id, timeline.challengeIndex);
  const state = beginChallenge(flown, mission, challenge);
  // SNAPSHOT: an exact, independent copy of the state at this decision point.
  const snapshot = { challengeIndex: timeline.challengeIndex, state: cloneState(state) };
  return { ...timeline, state, stage: 'challenge', snapshots: [...timeline.snapshots, snapshot] };
}

export function makeDecision(timeline: Timeline, mission: Mission, optionId: 'A' | 'B'): Timeline {
  if (timeline.stage !== 'challenge') return timeline;
  const challenge = getChallenge(mission.id, timeline.challengeIndex);
  const { state, record } = applyDecision(timeline.state, mission, challenge, optionId);
  return { ...timeline, state, stage: 'result', decisions: [...timeline.decisions, record] };
}

export function continueAfterDecision(timeline: Timeline, mission: Mission): Timeline {
  if (timeline.stage !== 'result') return timeline;
  if (findCriticals(timeline.state, false).length > 0) {
    return { ...timeline, stage: 'complete', outcome: evaluateOutcome(timeline.state, mission) };
  }
  return { ...timeline, stage: 'cruise', challengeIndex: timeline.challengeIndex + 1 };
}

/** Decision points in a timeline that the player can travel back to. */
export function rewindPoints(timeline: Timeline): number[] {
  return timeline.decisions
    .map((d) => d.challengeIndex)
    .filter((i) => timeline.snapshots.some((s) => s.challengeIndex === i));
}

/**
 * Creates an ALTERNATIVE timeline that starts from the snapshot taken at
 * `challengeIndex` in `source`. The source timeline is not modified.
 */
export function branchTimeline(
  source: Timeline,
  mission: Mission,
  challengeIndex: number,
  existingCount: number,
): Timeline | null {
  const snapshot = source.snapshots.find((s) => s.challengeIndex === challengeIndex);
  const previous = source.decisions.find((d) => d.challengeIndex === challengeIndex);
  if (!snapshot || !previous) return null;

  const state = cloneState(snapshot.state);
  // Lock the option already explored, unless the other one is unavailable.
  const challenge = getChallenge(mission.id, challengeIndex);
  const other = challenge.options.find((o) => o.id !== previous.optionId)!;
  const otherAvailable = getLockReason(state, mission, other) === null;

  return {
    id: `tl-${existingCount + 1}`,
    name: timelineName(existingCount),
    parentId: source.id,
    parentName: source.name,
    branchedAtChallenge: challengeIndex,
    lockedOption: otherAvailable ? { challengeIndex, optionId: previous.optionId } : null,
    stage: 'challenge',
    challengeIndex,
    state,
    snapshots: source.snapshots
      .filter((s) => s.challengeIndex <= challengeIndex)
      .map((s) => ({ challengeIndex: s.challengeIndex, state: cloneState(s.state) })),
    decisions: source.decisions.filter((d) => d.challengeIndex < challengeIndex),
    outcome: null,
  };
}

/** Hand-service life support in the active timeline (uses a repair kit). */
export function serviceOxygen(timeline: Timeline): Timeline {
  if (timeline.stage === 'complete') return timeline;
  const state = serviceLifeSupport(timeline.state);
  return state ? { ...timeline, state } : timeline;
}
