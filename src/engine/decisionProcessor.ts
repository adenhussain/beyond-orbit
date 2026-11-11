import type {
  Challenge,
  Condition,
  Effect,
  Rule,
  StatKey,
} from '../types/challenge';
import type { DecisionRecord, FlightState, LogEntry, Tag } from '../types/gameState';
import type { Mission } from '../types/mission';
import type { DebtType } from '../types/spacecraft';
import { clamp } from './technicalDebt';

/** Deep copy so that the engine never changes a state someone else is holding. */
export function cloneState(state: FlightState): FlightState {
  return structuredClone(state);
}

/** Fuel still needed for the burns that have not happened yet. */
export function plannedFuelRemaining(state: FlightState, mission: Mission): number {
  const fraction = mission.segmentBurn.slice(state.segmentsFlown).reduce((a, b) => a + b, 0);
  return state.specs.requiredFuel * fraction;
}

/** Reads one number from the live state. Conditions are built from these. */
export function getStat(state: FlightState, mission: Mission, key: StatKey): number {
  switch (key) {
    case 'debt.thermal': return state.debt.thermal;
    case 'debt.power': return state.debt.power;
    case 'debt.reliability': return state.debt.reliability;
    case 'debt.comm': return state.debt.comm;
    case 'batteryPct':
      return state.specs.batteryCapacity > 0 ? (state.batteryWh / state.specs.batteryCapacity) * 100 : 0;
    case 'backupHours': {
      const deficit = state.powerDraw - state.powerGen;
      return deficit > 0 ? state.batteryWh / deficit : 999;
    }
    case 'powerMarginPct':
      return state.powerDraw > 0 ? ((state.powerGen - state.powerDraw) / state.powerDraw) * 100 : 0;
    case 'fuelReservePct':
      return ((state.fuel - plannedFuelRemaining(state, mission)) / state.specs.requiredFuel) * 100;
    case 'compute': return state.specs.compute;
    case 'nav': return state.specs.nav;
    case 'radHard': return state.specs.radHard;
    case 'solar': return state.specs.solar ? 1 : 0;
    case 'twrMargin': return state.specs.twr - state.specs.minTwr;
    case 'hull': return state.hull;
    case 'health.computer': return state.health.computer;
    case 'health.science': return state.health.science;
    case 'health.structure': return state.health.structure;
    case 'repairKits': return state.repairKits;
    case 'oxygen': return state.oxygen;
  }
}

export function conditionsHold(state: FlightState, mission: Mission, when?: Condition[]): boolean {
  return (when ?? []).every((c) => {
    if (c.flag && !state.flags.includes(c.flag)) return false;
    if (c.notFlag && state.flags.includes(c.notFlag)) return false;
    if (c.stat) {
      const value = getStat(state, mission, c.stat);
      if (c.gte !== undefined && value < c.gte) return false;
      if (c.lt !== undefined && value >= c.lt) return false;
    }
    return true;
  });
}

const DESIGN_LIMITS: Partial<Record<StatKey, string>> = {
  nav: 'Navigation sensors',
  compute: 'Flight computer processing',
  radHard: 'Computer radiation hardness',
};

/** Which earlier decisions (flags), debts and design limits a set of conditions depends on. */
function causesOf(
  state: FlightState,
  mission: Mission,
  when?: Condition[],
): { flags: string[]; debts: DebtType[]; design: string[] } {
  const flags: string[] = [];
  const debts: DebtType[] = [];
  const design: string[] = [];
  for (const c of when ?? []) {
    if (c.flag) flags.push(c.flag);
    // A debt only counts as a cause when the rule needs it to be HIGH.
    if (c.stat?.startsWith('debt.') && c.gte !== undefined) {
      debts.push(c.stat.slice(5) as DebtType);
    }
    // A design limit counts as a cause when the rule needs it to be LOW.
    if (c.stat && c.lt !== undefined) {
      if (DESIGN_LIMITS[c.stat]) {
        design.push(`${DESIGN_LIMITS[c.stat]} rated ${getStat(state, mission, c.stat)}, below the ${c.lt} this situation required.`);
      } else if (c.stat === 'twrMargin') {
        design.push(`Engine thrust-to-weight ${state.specs.twr.toFixed(2)}, below the ${state.specs.minTwr} needed for a soft landing.`);
      }
    }
  }
  return { flags, debts, design };
}

const signed = (n: number, unit = '') => `${n > 0 ? '+' : '−'}${Math.abs(Math.round(n))}${unit}`;

interface EffectContext {
  source: string;
  kind: 'decision' | 'event';
  /** Flags that caused this to happen; new flags inherit their origin. */
  causeFlags: string[];
}

/**
 * Applies effects to `state` (which must already be a private copy) and
 * returns a human-readable list of what changed plus tags for the log.
 */
export function applyEffects(
  state: FlightState,
  effects: Effect[],
  ctx: EffectContext,
): { changes: string[]; tags: Tag[] } {
  const changes: string[] = [];
  const tags = new Set<Tag>();

  for (const e of effects) {
    switch (e.kind) {
      case 'fuel': {
        const delta = (state.specs.requiredFuel * e.pctOfRequired) / 100;
        state.fuel += delta;
        if (state.fuel < 0) {
          state.fuel = 0;
          if (!state.flags.includes('fuel_exhausted')) state.flags.push('fuel_exhausted');
        }
        changes.push(`Fuel ${signed(delta, ' kg')}`);
        tags.add('fuel');
        break;
      }
      case 'battery': {
        const before = state.batteryWh;
        const delta = (state.specs.batteryCapacity * e.pctOfCapacity) / 100;
        state.batteryWh = clamp(before + delta, 0, state.specs.batteryCapacity);
        changes.push(`Battery ${signed(state.batteryWh - before, ' Wh')}`);
        tags.add('battery');
        tags.add('power');
        break;
      }
      case 'powerGen':
        state.powerGen *= 1 + e.pct / 100;
        changes.push(`Power generation ${signed(e.pct, '%')}`);
        tags.add('power');
        break;
      case 'powerDraw':
        state.powerDraw *= 1 + e.pct / 100;
        changes.push(`Power demand ${signed(e.pct, '%')}`);
        tags.add('power');
        break;
      case 'comm':
        state.commKbps *= 1 + e.pct / 100;
        changes.push(`Data rate ${signed(e.pct, '%')}`);
        tags.add('comm');
        break;
      case 'science':
        state.scienceMult *= 1 + e.pct / 100;
        changes.push(`Science yield ${signed(e.pct, '%')}`);
        tags.add('science');
        break;
      case 'debt':
        state.debt[e.debt] = clamp(state.debt[e.debt] + e.amount, 0, 100);
        state.debtLedger.push({
          debt: e.debt, amount: e.amount, source: ctx.source, kind: ctx.kind, day: state.day,
        });
        changes.push(`${e.debt[0].toUpperCase()}${e.debt.slice(1)} debt ${signed(e.amount)}`);
        tags.add(e.debt);
        break;
      case 'health':
        state.health[e.system] = clamp(state.health[e.system] + e.amount, 0, 100);
        changes.push(`${e.system[0].toUpperCase()}${e.system.slice(1)} health ${signed(e.amount)}`);
        if (e.system === 'computer') {
          tags.add('computer');
          tags.add('reliability');
        }
        if (e.system === 'science') tags.add('science');
        if (e.system === 'structure') tags.add('hull');
        break;
      case 'hull':
        state.hull = Math.max(0, state.hull + e.amount);
        changes.push(`Structural margin ${signed(e.amount)}`);
        tags.add('hull');
        break;
      case 'repair':
        state.repairKits = Math.max(0, state.repairKits + e.amount);
        changes.push(`Repair kits ${signed(e.amount)}`);
        break;
      case 'oxygen':
        state.oxygen = clamp(state.oxygen + e.amount, 0, 100);
        changes.push(`Oxygen ${signed(e.amount, '%')}`);
        tags.add('oxygen');
        break;
      case 'flag':
        if (!state.flags.includes(e.flag)) state.flags.push(e.flag);
        // A flag raised by a hazard inherits the decision that caused the hazard.
        if (!state.flagOrigins[e.flag]) {
          const parent = ctx.causeFlags.map((f) => state.flagOrigins[f]).find(Boolean);
          if (parent) state.flagOrigins[e.flag] = parent;
        }
        break;
    }
  }
  return { changes, tags: [...tags] };
}

export function pushLog(state: FlightState, entry: Omit<LogEntry, 'id' | 'day' | 'phase'>): void {
  state.log.push({ ...entry, id: state.log.length + 1, day: state.day, phase: state.phase });
}

/** Fires a hazard or situation rule if its conditions hold. Mutates `state`. */
export function applyRule(
  state: FlightState,
  mission: Mission,
  rule: Rule,
  kind: 'hazard' | 'situation',
): boolean {
  if (!conditionsHold(state, mission, rule.when)) return false;
  const causes = causesOf(state, mission, rule.when);
  const { changes, tags } = applyEffects(state, rule.effects, {
    source: rule.title, kind: 'event', causeFlags: causes.flags,
  });
  pushLog(state, {
    kind, severity: rule.severity, title: rule.title, text: rule.narrative,
    tags, changes, causedByFlags: causes.flags, causedByDebts: causes.debts, causedByDesign: causes.design,
  });
  return true;
}

/**
 * Resolves the player's choice. Returns a NEW state plus a record of what
 * happened; the input state is left untouched (the Time Machine relies on this).
 */
export function applyDecision(
  input: FlightState,
  mission: Mission,
  challenge: Challenge,
  optionId: 'A' | 'B',
): { state: FlightState; record: DecisionRecord } {
  const state = cloneState(input);
  const option = challenge.options.find((o) => o.id === optionId)!;
  const branch = option.branches.find((b) => conditionsHold(state, mission, b.when))!;
  const causes = causesOf(state, mission, branch.when);

  // Remember which decision raised each flag, for the Failure Autopsy.
  for (const e of branch.effects) {
    if (e.kind === 'flag') {
      state.flagOrigins[e.flag] = {
        challengeIndex: challenge.index,
        challengeTitle: challenge.title,
        optionId,
        optionLabel: option.label,
      };
    }
  }
  const { changes, tags } = applyEffects(state, branch.effects, {
    source: `Decision: ${option.label}`, kind: 'decision', causeFlags: causes.flags,
  });
  pushLog(state, {
    kind: 'decision',
    severity: branch.verdict === 'good' ? 'good' : branch.verdict === 'bad' ? 'crit' : 'warn',
    title: `${option.label} → ${branch.title}`,
    text: branch.narrative,
    tags, changes, causedByFlags: causes.flags, causedByDebts: causes.debts, causedByDesign: causes.design,
  });

  return {
    state,
    record: {
      challengeIndex: challenge.index,
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      optionId,
      optionLabel: option.label,
      resultTitle: branch.title,
      narrative: branch.narrative,
      verdict: branch.verdict,
      changes,
      day: state.day,
    },
  };
}
