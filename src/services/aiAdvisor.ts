import type { MissionOutcome } from '../types/gameState';
import type { Mission } from '../types/mission';
import type { BuildStats, Debts } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';

/**
 * MISSION REVIEW BOARD.
 *
 * Architecture rule: the game engine calculates every number and the mission
 * outcome. Advisors only EXPLAIN those verified facts. They never decide
 * whether the mission succeeded.
 *
 * The game ships with built-in advisor responses (localReviews). If you set
 * VITE_AI_ADVISOR_URL to a backend you run yourself (for example Python +
 * FastAPI holding the API key server-side), the same facts are sent there and
 * its wording is used instead. If that call fails, the built-in responses are
 * used. No API key is ever placed in this frontend code.
 */

export interface ReviewFacts {
  mission: { name: string; objective: string; budget: number };
  result: MissionOutcome['result'];
  criticals: string[];
  cost: number;
  sciencePotential: number;
  scienceReturned: number;
  scienceTarget: number;
  sciencePct: number;
  dataGeneratedGB: number;
  dataReturnedGB: number;
  fuelReservePct: number;
  powerMarginPct: number;
  thermalRating: number;
  thermalDemand: number;
  avgReliability: number;
  designDebt: Debts;
  finalDebt: Debts;
  hullStart: number;
  hullEnd: number;
  decisions: { challenge: string; choice: string; result: string; verdict: string }[];
  hazards: string[];
  timelineName: string;
  timelinesExplored: number;
}

export interface AdvisorReview {
  id: string;
  role: string;
  focus: string;
  stance: 'approve' | 'concern' | 'critical';
  headline: string;
  comments: string[];
  source: 'built-in' | 'ai';
}

export function buildReviewFacts(
  mission: Mission, stats: BuildStats, timeline: Timeline, timelinesExplored: number,
): ReviewFacts {
  const outcome = timeline.outcome!;
  const designDebt: Debts = { thermal: 0, power: 0, reliability: 0, comm: 0 };
  for (const entry of timeline.state.debtLedger) {
    if (entry.kind === 'build') designDebt[entry.debt] = Math.min(100, designDebt[entry.debt] + entry.amount);
  }
  return {
    mission: { name: mission.name, objective: mission.objective, budget: mission.budget },
    result: outcome.result,
    criticals: outcome.criticals.map((c) => c.title),
    cost: stats.cost,
    sciencePotential: outcome.sciencePotential,
    scienceReturned: outcome.scienceReturned,
    scienceTarget: outcome.scienceTarget,
    sciencePct: outcome.sciencePct,
    dataGeneratedGB: outcome.dataGeneratedGB,
    dataReturnedGB: outcome.dataReturnedGB,
    fuelReservePct: stats.fuelReservePct,
    powerMarginPct: stats.powerMarginPct,
    thermalRating: stats.thermalRating,
    thermalDemand: stats.thermalDemand,
    avgReliability: stats.avgReliability,
    designDebt,
    finalDebt: outcome.final.debt,
    hullStart: stats.hullRating,
    hullEnd: outcome.final.hull,
    decisions: timeline.decisions.map((d) => ({
      challenge: d.challengeTitle, choice: d.optionLabel, result: d.resultTitle, verdict: d.verdict,
    })),
    hazards: timeline.state.log.filter((e) => e.kind === 'hazard' && e.severity !== 'good' && e.severity !== 'info').map((e) => e.title),
    timelineName: timeline.name,
    timelinesExplored,
  };
}

type Stance = AdvisorReview['stance'];
const worst = (a: Stance, b: Stance): Stance =>
  a === 'critical' || b === 'critical' ? 'critical' : a === 'concern' || b === 'concern' ? 'concern' : 'approve';

/** Built-in advisor responses, generated from the verified facts. */
export function localReviews(f: ReviewFacts): AdvisorReview[] {
  const failed = f.result === 'failure';

  // --- Chief Engineer: spacecraft design ---
  const eng: string[] = [];
  let engStance: Stance = 'approve';
  const debts = Object.entries(f.designDebt) as [keyof Debts, number][];
  const worstDebt = debts.sort((a, b) => b[1] - a[1])[0];
  if (worstDebt[1] >= 55) {
    engStance = 'critical';
    eng.push(`The design left the pad with ${worstDebt[0]} debt of ${worstDebt[1]}. That is a known weakness we chose to fly with.`);
  } else if (worstDebt[1] >= 25) {
    engStance = 'concern';
    eng.push(`${worstDebt[0][0].toUpperCase()}${worstDebt[0].slice(1)} debt of ${worstDebt[1]} was the thinnest part of the design.`);
  } else {
    eng.push('Design debt was low in every category. This was a well-margined spacecraft.');
  }
  eng.push(`Thermal rating ${f.thermalRating} against ${f.thermalDemand} required; power margin ${f.powerMarginPct.toFixed(0)}%; fuel reserve ${f.fuelReservePct.toFixed(0)}%.`);
  if (f.fuelReservePct < 15) { engStance = worst(engStance, 'concern'); eng.push('A fuel reserve under 15% leaves no room for an unplanned manoeuvre.'); }
  if (f.sciencePotential < f.scienceTarget) { engStance = worst(engStance, 'concern'); eng.push(`The payload could deliver only ${f.sciencePotential} of ${f.scienceTarget} points. No flight performance could have closed that gap.`); }

  // --- Financial Advisor: budget efficiency ---
  const fin: string[] = [];
  const unspent = f.mission.budget - f.cost;
  let finStance: Stance = failed ? 'critical' : 'approve';
  fin.push(`Spent $${f.cost}M of $${f.mission.budget}M (${((f.cost / f.mission.budget) * 100).toFixed(0)}% of budget).`);
  if (f.scienceReturned > 0) fin.push(`Cost per science point returned: $${(f.cost / f.scienceReturned).toFixed(1)}M.`);
  else fin.push('No science was returned, so the entire spend produced no scientific value.');
  if (unspent >= 15 && worstDebt[1] >= 25) {
    finStance = worst(finStance, 'concern');
    fin.push(`$${unspent}M was left unspent while the design carried ${worstDebt[0]} debt of ${worstDebt[1]}. That money could have bought margin.`);
  } else if (unspent < 5) {
    fin.push('The budget was used almost completely. There was no financial reserve.');
  }

  // --- Scientific Director: science output ---
  const sci: string[] = [];
  const sciStance: Stance = f.sciencePct >= 100 ? 'approve' : f.sciencePct >= 50 ? 'concern' : 'critical';
  sci.push(`${f.scienceReturned.toFixed(0)} of ${f.scienceTarget} required science points reached Earth (${Math.floor(f.sciencePct)}% of the objective).`);
  if (f.sciencePotential > 0) {
    const lost = f.sciencePotential - f.scienceReturned;
    if (lost > 1) sci.push(`The instruments could have produced ${f.sciencePotential} points; ${lost.toFixed(0)} were lost between the instrument and Earth.`);
  }
  if (f.dataReturnedGB < f.dataGeneratedGB - 0.05) sci.push(`Only ${f.dataReturnedGB.toFixed(1)} of ${f.dataGeneratedGB.toFixed(1)} GB of data was returned. Data left on the spacecraft is science we never see.`);
  else if (f.dataGeneratedGB > 0) sci.push(`All ${f.dataGeneratedGB.toFixed(1)} GB of collected data was returned.`);

  // --- Flight Director: operational decisions ---
  const ops: string[] = [];
  const bad = f.decisions.filter((d) => d.verdict === 'bad');
  const good = f.decisions.filter((d) => d.verdict === 'good');
  let opsStance: Stance = bad.length > 0 ? 'concern' : 'approve';
  if (f.decisions.length === 0) ops.push('The mission ended before any in-flight decision was made.');
  for (const d of f.decisions) ops.push(`${d.challenge}: chose "${d.choice}" → ${d.result}.`);
  if (bad.length > 0) ops.push(`${bad.length} decision${bad.length > 1 ? 's' : ''} went off-nominal. The flight-director analysis flagged the risk before each of them.`);
  if (good.length === f.decisions.length && good.length > 0) ops.push('Every call matched what the spacecraft could actually support.');
  if (failed && bad.length > 0) opsStance = 'critical';
  if (failed && bad.length === 0 && f.decisions.length > 0) {
    opsStance = 'concern';
    ops.push('Each call was defensible on its own. Their combined cost is what ended the mission.');
  }
  ops.push(f.timelinesExplored > 1
    ? `This is timeline ${f.timelineName}, one of ${f.timelinesExplored} explored with the Time Machine.`
    : 'Only one timeline was flown. The Time Machine can show what the other choices would have done.');

  // --- Safety Officer: reliability and risk ---
  const saf: string[] = [];
  let safStance: Stance = f.criticals.length > 0 ? 'critical' : 'approve';
  if (f.criticals.length > 0) saf.push(`Mission-ending failure: ${f.criticals.join(', ')}.`);
  saf.push(`Average component reliability ${(f.avgReliability * 100).toFixed(1)}%. Structural margin went from ${f.hullStart} to ${Math.round(f.hullEnd)}.`);
  if (f.hazards.length > 0) {
    safStance = worst(safStance, 'concern');
    saf.push(`${f.hazards.length} hazard${f.hazards.length > 1 ? 's' : ''} triggered in flight: ${f.hazards.join('; ')}.`);
  } else {
    saf.push('No debt-driven hazards triggered in flight.');
  }
  const highFinal = (Object.entries(f.finalDebt) as [string, number][]).filter(([, v]) => v >= 60);
  if (highFinal.length > 0) {
    safStance = worst(safStance, 'concern');
    saf.push(`Debt ended above the hazard threshold in: ${highFinal.map(([k, v]) => `${k} (${Math.round(v)})`).join(', ')}.`);
  }

  const head = (stance: Stance, a: string, c: string, x: string) => (stance === 'approve' ? a : stance === 'concern' ? c : x);
  const make = (id: string, role: string, focus: string, stance: Stance, headline: string, comments: string[]): AdvisorReview =>
    ({ id, role, focus, stance, headline, comments, source: 'built-in' });

  return [
    make('engineer', 'Chief Engineer', 'Spacecraft design', engStance, head(engStance, 'A sound design.', 'Flyable, with thin margins.', 'The design was the problem.'), eng),
    make('finance', 'Financial Advisor', 'Budget efficiency', finStance, head(finStance, 'Money well spent.', 'The budget was not used where it mattered.', 'A total loss on the investment.'), fin),
    make('science', 'Scientific Director', 'Scientific output', sciStance, head(sciStance, 'The objective was met.', 'Useful data, but less than we came for.', 'The science case was not delivered.'), sci),
    make('flight', 'Flight Director', 'Operational decisions', opsStance, head(opsStance, 'Disciplined flying.', 'Some calls cost us.', 'Operational decisions contributed to the loss.'), ops),
    make('safety', 'Safety Officer', 'Reliability and risk', safStance, head(safStance, 'Risk was controlled.', 'We accepted more risk than I like.', 'An avoidable loss of mission.'), saf),
  ];
}

/**
 * Returns advisor reviews. Uses an optional backend if configured, and falls
 * back to the built-in responses on any problem. The engine's outcome is
 * passed along as a fact; the advisors cannot change it.
 */
export async function getAdvisorReviews(facts: ReviewFacts): Promise<AdvisorReview[]> {
  const fallback = localReviews(facts);
  const url = import.meta.env.VITE_AI_ADVISOR_URL as string | undefined;
  if (!url) return fallback;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ facts }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return fallback;
    const data = (await response.json()) as { reviews?: { id: string; headline: string; comments: string[] }[] };
    if (!Array.isArray(data.reviews)) return fallback;
    // Keep role and stance from the engine-derived review; take only the wording.
    return fallback.map((local) => {
      const remote = data.reviews!.find((r) => r.id === local.id);
      return remote && Array.isArray(remote.comments) && remote.comments.length > 0
        ? { ...local, headline: String(remote.headline ?? local.headline), comments: remote.comments.map(String), source: 'ai' as const }
        : local;
    });
  } catch {
    return fallback;
  }
}
