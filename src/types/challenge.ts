import type { RoomId } from './resources';
import type { CategoryId, DebtType } from './spacecraft';

/**
 * Challenges are written as DATA (conditions + effects). The engine in
 * src/engine/decisionProcessor.ts interprets them. This keeps the story
 * separate from the simulation code.
 */

export type StatKey =
  | 'debt.thermal'
  | 'debt.power'
  | 'debt.reliability'
  | 'debt.comm'
  | 'batteryPct'
  | 'backupHours' // hours the battery can cover the current power deficit
  | 'powerMarginPct'
  | 'fuelReservePct' // fuel left after all planned burns, % of required fuel
  | 'compute'
  | 'nav'
  | 'radHard'
  | 'solar' // 1 = solar powered, 0 = not
  | 'twrMargin' // thrust-to-weight minus the mission minimum
  | 'hull'
  | 'health.computer'
  | 'health.science'
  | 'health.structure'
  | 'repairKits'
  | 'oxygen';

/** All fields that are present must be true (logical AND). */
export interface Condition {
  flag?: string;
  notFlag?: string;
  stat?: StatKey;
  gte?: number;
  lt?: number;
}

export type Effect =
  | { kind: 'fuel'; pctOfRequired: number }
  | { kind: 'battery'; pctOfCapacity: number }
  | { kind: 'powerGen'; pct: number }
  | { kind: 'powerDraw'; pct: number }
  | { kind: 'comm'; pct: number }
  | { kind: 'science'; pct: number }
  | { kind: 'debt'; debt: DebtType; amount: number }
  | { kind: 'health'; system: CategoryId; amount: number }
  | { kind: 'hull'; amount: number }
  | { kind: 'flag'; flag: string }
  | { kind: 'repair'; amount: number } // repair kits (negative = used)
  | { kind: 'oxygen'; amount: number };

export type Verdict = 'good' | 'mixed' | 'bad';

/** One possible result. The first branch whose conditions all hold is used. */
export interface OutcomeBranch {
  when?: Condition[];
  effects: Effect[];
  title: string;
  narrative: string;
  verdict: Verdict;
}

/** Something that happens automatically if its conditions hold. */
export interface Rule {
  id: string;
  when?: Condition[];
  effects: Effect[];
  title: string;
  narrative: string;
  severity: 'info' | 'good' | 'warn' | 'crit';
}

export interface Advisory {
  when?: Condition[];
  level: 'good' | 'warn' | 'crit';
  text: string;
}

export interface ChallengeOption {
  id: 'A' | 'B';
  label: string;
  summary: string;
  pros: string[];
  cons: string[];
  /** Flight-director notes computed from the live spacecraft state. */
  advisories: Advisory[];
  /** If these conditions hold, the option cannot be chosen. */
  lockedWhen?: { when: Condition[]; reason: string };
  branches: OutcomeBranch[];
}

export interface Challenge {
  id: string;
  missionId: string;
  index: 0 | 1 | 2;
  title: string;
  alert: string;
  description: string;
  /** The room of the spacecraft the astronaut must go to. */
  room: RoomId;
  /** Applied when the challenge begins. Every matching rule fires. */
  situation: Rule[];
  options: [ChallengeOption, ChallengeOption];
}

/** A hazard checked while flying a segment (the Butterfly Effect of earlier choices). */
export interface PassiveEvent extends Rule {
  missionId: string;
  segment: 0 | 1 | 2 | 3;
}
