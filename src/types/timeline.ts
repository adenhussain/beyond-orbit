import type { DecisionRecord, FlightState, MissionOutcome } from './gameState';

/** A frozen copy of the spacecraft state taken at a decision point. */
export interface Snapshot {
  challengeIndex: number;
  state: FlightState;
}

export type TimelineStage =
  | 'cruise' // flying towards the next challenge (or the end of the mission)
  | 'challenge' // waiting for the player's decision
  | 'result' // showing what the decision did
  | 'complete';

export interface Timeline {
  id: string;
  name: string;
  parentId: string | null;
  parentName: string | null;
  /** Index of the challenge where this timeline split from its parent. */
  branchedAtChallenge: number | null;
  /** At the branch point the option already explored in the parent is locked. */
  lockedOption: { challengeIndex: number; optionId: 'A' | 'B' } | null;
  stage: TimelineStage;
  /** 0..2 = challenge the craft is flying to / facing. 3 = final leg. */
  challengeIndex: number;
  state: FlightState;
  snapshots: Snapshot[];
  decisions: DecisionRecord[];
  outcome: MissionOutcome | null;
}
