import type { Inventory, RoomId } from './resources';
import type { SpaceWeather } from './spaceWeather';
import type { Build, CategoryId, DebtType, Debts } from './spacecraft';
import type { Verdict } from './challenge';
import type { Timeline } from './timeline';

export type Tag = DebtType | 'fuel' | 'hull' | 'science' | 'computer' | 'battery' | 'oxygen';

export interface LogEntry {
  id: number;
  day: number;
  phase: string;
  kind: 'build' | 'flight' | 'hazard' | 'situation' | 'decision' | 'outcome';
  severity: 'info' | 'good' | 'warn' | 'crit';
  title: string;
  text: string;
  tags: Tag[];
  /** What actually changed, e.g. "Fuel -68 kg". */
  changes: string[];
  /** Flags (earlier decisions) and debts that caused this entry to fire. */
  causedByFlags: string[];
  causedByDebts: DebtType[];
  /** Fixed design limits (e.g. weak navigation) that this entry depended on. */
  causedByDesign?: string[];
}

export interface DebtEntry {
  debt: DebtType;
  amount: number;
  source: string;
  kind: 'build' | 'decision' | 'event';
  day: number;
}

export interface FlagOrigin {
  challengeIndex: number;
  challengeTitle: string;
  optionId: 'A' | 'B';
  optionLabel: string;
}

/** Fixed properties of the spacecraft design that the flight engine needs. */
export interface FlightSpecs {
  compute: number;
  nav: number;
  radHard: number;
  solar: boolean;
  requiredFuel: number;
  fuelCapacity: number;
  batteryCapacity: number;
  storageGB: number;
  sciencePoints: number;
  dataGB: number;
  twr: number;
  minTwr: number;
  hullRating: number;
  scienceTarget: number;
  commWindowHours: number;
}

/** The complete, self-contained state of one spacecraft in flight. */
export interface FlightState {
  missionId: string;
  segmentsFlown: number;
  progress: number;
  day: number;
  phase: string;
  location: string;
  fuel: number;
  batteryWh: number;
  powerGen: number;
  powerDraw: number;
  commKbps: number;
  scienceMult: number;
  hull: number;
  /** Cabin oxygen reserve, 0..100. */
  oxygen: number;
  /** Repair kits carried aboard from the exploration phase. */
  repairKits: number;
  health: Record<CategoryId, number>;
  debt: Debts;
  debtLedger: DebtEntry[];
  flags: string[];
  flagOrigins: Record<string, FlagOrigin>;
  log: LogEntry[];
  specs: FlightSpecs;
  /** Real solar activity captured at launch (live NASA data), if available. */
  spaceWeather?: SpaceWeather;
}

export interface DecisionRecord {
  challengeIndex: number;
  challengeId: string;
  challengeTitle: string;
  optionId: 'A' | 'B';
  optionLabel: string;
  resultTitle: string;
  narrative: string;
  verdict: Verdict;
  changes: string[];
  day: number;
}

export type OutcomeResult = 'success' | 'partial' | 'failure';
export type FailureDomain = 'fuel' | 'hull' | 'computer' | 'thermal' | 'power' | 'science' | 'oxygen';

export interface CriticalFailure {
  domain: FailureDomain;
  title: string;
  detail: string;
}

export interface MissionOutcome {
  result: OutcomeResult;
  headline: string;
  summary: string;
  criticals: CriticalFailure[];
  reasons: { tone: 'good' | 'warn' | 'crit'; text: string }[];
  sciencePotential: number; // points the instruments could have produced
  scienceCollected: number; // after damage and curtailed operations
  scienceReturned: number; // after storage and downlink limits
  scienceTarget: number;
  sciencePct: number; // returned / target * 100
  dataGeneratedGB: number;
  dataStoredGB: number;
  dataReturnedGB: number;
  downlinkCapacityGB: number;
  final: {
    fuel: number;
    fuelPct: number;
    batteryPct: number;
    hull: number;
    oxygen: number;
    powerGen: number;
    powerDraw: number;
    commKbps: number;
    debt: Debts;
    health: Record<CategoryId, number>;
  };
}

export type Screen =
  | 'menu'
  | 'missions'
  | 'briefing'
  | 'explore'
  | 'builder'
  | 'launch'
  | 'flight'
  | 'outcome'
  | 'autopsy'
  | 'review';

export interface GameState {
  screen: Screen;
  missionId: string | null;
  build: Build;
  timelines: Timeline[];
  activeTimelineId: string | null;
  timeMachineOpen: boolean;
  soundOn: boolean;
  crtOn: boolean;
  /** Supplies collected on foot. Shared with the workshop. */
  inventory: Inventory;
  /** Ids of world items already picked up (so they stay gone). */
  collected: string[];
  /** True once the astronaut has reached the workshop (used as spawn point). */
  atWorkshop: boolean;
  /** In flight: the challenge dialog opens only after reaching the right console. */
  challengeOpen: boolean;
  /** In flight: which room's system console is open, if any. */
  systemPanel: RoomId | null;
  paused: boolean;
  /** Latest real space weather from NASA, used at the next launch. */
  spaceWeather: SpaceWeather | null;
  musicOn: boolean;
  colorBlind: boolean;
  touchControls: boolean;
  /** Guided 3-minute demo for presentations. */
  demo: boolean;
}
