import { challengesForMission } from '../data/challenges';
import type { FailureDomain, LogEntry, Tag } from '../types/gameState';
import type { Mission } from '../types/mission';
import type { DebtType } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';
import { DEBT_LABEL } from './resourceCalculator';

/**
 * FAILURE AUTOPSY.
 * Walks backwards through the simulation log to explain a failure. Nothing
 * here is pre-written per outcome: every line comes from records the engine
 * made while the mission was flown.
 */

export interface AutopsyLink {
  day: number;
  phase: string;
  title: string;
  text: string;
  changes: string[];
  kind: LogEntry['kind'];
  severity: LogEntry['severity'];
  because: string[];
}

export interface AutopsyDecision {
  challengeIndex: number;
  challengeTitle: string;
  chosen: string;
  result: string;
  alternative: string;
}

export interface Autopsy {
  grade: 'failure' | 'damage';
  whatFailed: string;
  whatFailedDetail: string;
  whenFailed: string;
  primaryCause: { title: string; text: string; isDesign: boolean };
  weaknesses: string[];
  decisions: AutopsyDecision[];
  cascade: AutopsyLink[];
  recommendations: string[];
}

const DOMAIN_TAGS: Record<FailureDomain, Tag[]> = {
  fuel: ['fuel'],
  hull: ['hull'],
  computer: ['computer'],
  thermal: ['thermal'],
  power: ['power', 'battery'],
  science: ['science', 'comm'],
  oxygen: ['oxygen', 'power', 'thermal'],
};

const DESIGN_ADVICE: Record<DebtType, string> = {
  thermal: 'Fit stronger thermal control so the thermal rating meets the mission requirement.',
  power: 'Increase power generation or battery capacity to restore a 25% margin and full shadow reserve.',
  reliability: 'Replace the lowest-reliability components, or accept lower performance for proven hardware.',
  comm: 'Fit a faster antenna or add a secondary radio so the downlink exceeds the science data volume.',
};

export function analyzeFailure(timeline: Timeline, mission: Mission): Autopsy | null {
  const outcome = timeline.outcome;
  if (!outcome) return null;
  const log = timeline.state.log;
  const serious = log.filter((e) => e.severity === 'crit' && e.kind !== 'build');

  // Which area of the spacecraft are we investigating?
  let domain: FailureDomain;
  let whatFailed: string;
  let whatFailedDetail: string;
  if (outcome.criticals.length > 0) {
    domain = outcome.criticals[0].domain;
    whatFailed = outcome.criticals[0].title;
    whatFailedDetail = outcome.criticals[0].detail;
  } else if (serious.length > 0 || outcome.result === 'partial') {
    const worst = serious[serious.length - 1];
    domain = 'science';
    whatFailed = worst ? worst.title : 'Science objective only partly achieved';
    whatFailedDetail = worst
      ? worst.text
      : `Only ${Math.floor(outcome.sciencePct)}% of the science objective reached Earth.`;
  } else {
    return null; // clean success: nothing to investigate
  }

  // 1. Collect every warning/critical log entry in the failed area.
  const tags = new Set<Tag>(DOMAIN_TAGS[domain]);
  const relevant = (e: LogEntry) => e.severity !== 'info' && e.severity !== 'good' && e.tags.some((t) => tags.has(t));
  let chain = log.filter(relevant);
  if (outcome.criticals.length === 0) {
    // Serious damage: include every critical event regardless of area.
    chain = log.filter((e) => relevant(e) || serious.includes(e));
  }

  // 2. Follow the causes one step back: debts that triggered those entries.
  const debts = new Set<DebtType>(chain.flatMap((e) => e.causedByDebts));
  if (domain === 'thermal' || domain === 'power') debts.add(domain);
  if (domain === 'computer') debts.add('reliability');
  for (const e of log) {
    const feedsDebt = e.tags.some((t) => debts.has(t as DebtType));
    if (feedsDebt && e.severity !== 'good' && (e.kind === 'build' || e.changes.some((c) => c.includes('debt +')))) {
      if (!chain.includes(e)) chain.push(e);
    }
  }
  // ...and the decisions whose consequences appear in the chain.
  const origins = timeline.state.flagOrigins;
  for (const e of [...chain]) {
    for (const flag of e.causedByFlags) {
      const origin = origins[flag];
      const decisionEntry = origin && log.find((l) => l.kind === 'decision' && l.title.startsWith(origin.optionLabel));
      if (decisionEntry && !chain.includes(decisionEntry)) chain.push(decisionEntry);
    }
  }
  chain.sort((a, b) => a.id - b.id);

  // 3. Describe each link, including why it happened.
  const cascade: AutopsyLink[] = chain.map((e) => ({
    day: e.day, phase: e.phase, title: e.title, text: e.text, changes: e.changes,
    kind: e.kind, severity: e.severity,
    because: [
      ...e.causedByFlags.filter((f) => origins[f]).map(
        (f) => `Consequence of choosing "${origins[f].optionLabel}" at Challenge ${origins[f].challengeIndex + 1}`,
      ),
      ...e.causedByDebts.map((d) => `Triggered by high ${DEBT_LABEL[d].toLowerCase()} debt`),
      ...(e.causedByDesign ?? []).map((d) => `Design limit: ${d}`),
    ],
  }));

  // 4. Decisions that contributed, each with the road not taken.
  const challenges = challengesForMission(mission.id);
  const indices = new Set<number>();
  for (const e of chain) {
    for (const f of e.causedByFlags) if (origins[f]) indices.add(origins[f].challengeIndex);
    if (e.kind === 'decision') {
      const d = timeline.decisions.find((r) => e.title.startsWith(r.optionLabel));
      if (d) indices.add(d.challengeIndex);
    }
  }
  const decisions: AutopsyDecision[] = [...indices].sort().flatMap((i) => {
    const record = timeline.decisions.find((d) => d.challengeIndex === i);
    if (!record) return [];
    const alternative = challenges[i].options.find((o) => o.id !== record.optionId)!;
    return [{
      challengeIndex: i, challengeTitle: record.challengeTitle, chosen: record.optionLabel,
      result: record.resultTitle, alternative: alternative.label,
    }];
  });

  // 5. Root cause. A design weakness in the chain comes first. Otherwise it
  //    is the earliest decision whose consequences appear later in the chain.
  const designLinks = chain.filter((e) => e.kind === 'build');
  const designLimits = [...new Set(chain.flatMap((e) => e.causedByDesign ?? []))];
  const causalIndex = Math.min(
    ...chain.flatMap((e) => e.causedByFlags.filter((f) => origins[f]).map((f) => origins[f].challengeIndex)),
  );
  const causalRecord = timeline.decisions.find((d) => d.challengeIndex === causalIndex);
  const causalDecision = causalRecord && chain.find((e) => e.kind === 'decision' && e.title.startsWith(causalRecord.optionLabel));
  const root = designLinks[0] ?? causalDecision ?? chain[0];
  const primaryCause = root
    ? { title: root.title, text: root.text, isDesign: root.kind === 'build' }
    : { title: whatFailed, text: whatFailedDetail, isDesign: false };

  // 6. Recommendations built from the same records.
  const recommendations: string[] = [];
  for (const d of decisions) {
    recommendations.push(
      `Time Machine: return to Challenge ${d.challengeIndex + 1} (${d.challengeTitle}) and choose "${d.alternative}" instead of "${d.chosen}".`,
    );
  }
  const designDebts = new Set(
    timeline.state.debtLedger.filter((l) => l.kind === 'build' && debts.has(l.debt)).map((l) => l.debt),
  );
  for (const d of designDebts) recommendations.push(`Redesign: ${DESIGN_ADVICE[d]}`);
  for (const limit of designLimits) recommendations.push(`Redesign: upgrade the limiting system. ${limit}`);
  const specs = timeline.state.specs;
  if (domain === 'fuel') {
    const reserve = ((specs.fuelCapacity - specs.requiredFuel) / specs.requiredFuel) * 100;
    recommendations.push(
      `Redesign: launch with more than the ${reserve.toFixed(0)}% fuel reserve you carried. Use a larger tank, a more efficient engine or a lighter spacecraft.`,
    );
  }
  if (domain === 'hull' && specs.hullRating < 100) {
    recommendations.push(`Redesign: the bus had a structural margin of ${specs.hullRating}. A stronger bus tolerates rough landings.`);
  }
  if (domain === 'science') {
    if (outcome.sciencePotential < outcome.scienceTarget) {
      recommendations.push(
        `Redesign: the instruments could deliver at most ${outcome.sciencePotential} of ${outcome.scienceTarget} points. Carry a more capable payload.`,
      );
    }
    if (outcome.dataReturnedGB < outcome.dataStoredGB - 0.05) {
      recommendations.push(
        `Redesign: the downlink returned ${outcome.dataReturnedGB.toFixed(1)} of ${outcome.dataStoredGB.toFixed(1)} GB. Fit a faster antenna or a relay radio.`,
      );
    }
    if (outcome.dataStoredGB < outcome.dataGeneratedGB - 0.05) {
      recommendations.push('Redesign: fit a flight computer with more data storage.');
    }
  }
  if (recommendations.length === 0) {
    recommendations.push('No single decision caused this. Rebuild with more margin in the failed system and fly again.');
  }

  const lastLink = chain[chain.length - 1];
  return {
    grade: outcome.result === 'failure' ? 'failure' : 'damage',
    whatFailed,
    whatFailedDetail,
    whenFailed: lastLink
      ? `Mission day ${lastLink.day}, during ${lastLink.phase}`
      : `Mission day ${timeline.state.day}, during ${timeline.state.phase}`,
    primaryCause,
    weaknesses: [...designLinks.map((e) => e.text), ...designLimits],
    decisions,
    cascade,
    recommendations,
  };
}
