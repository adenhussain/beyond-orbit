import type { Timeline } from '../types/timeline';

/**
 * Mission score: a single number that rewards science, safety and frugality,
 * so players have a reason to replay and try other designs and decisions.
 * Every point comes from values the engine already calculated.
 */

export interface ScoreLine {
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface MissionScore {
  total: number;
  max: number;
  rank: string;
  lines: ScoreLine[];
}

const RANKS: [number, string][] = [
  [1150, 'Mission Legend'],
  [950, 'Flight Director'],
  [700, 'Mission Specialist'],
  [450, 'Astronaut Candidate'],
  [0, 'Trainee'],
];

export function scoreMission(timeline: Timeline, cost: number, budget: number): MissionScore | null {
  const outcome = timeline.outcome;
  if (!outcome) return null;
  const sciencePct = Math.min(150, outcome.sciencePct);
  const unspent = Math.max(0, (budget - cost) / budget);
  const lines: ScoreLine[] = [
    {
      label: 'Science returned',
      points: Math.round(sciencePct * 4),
      max: 600,
      detail: `${Math.floor(outcome.sciencePct)}% of the objective (counts up to 150%)`,
    },
    {
      label: 'Mission outcome',
      points: outcome.result === 'success' ? 300 : outcome.result === 'partial' ? 100 : 0,
      max: 300,
      detail: outcome.headline.toLowerCase(),
    },
    {
      label: 'Crew safety',
      points: Math.round(outcome.final.oxygen),
      max: 100,
      detail: `${Math.round(outcome.final.oxygen)}% oxygen left`,
    },
    {
      label: 'Spacecraft condition',
      points: Math.round(Math.min(100, outcome.final.hull)),
      max: 100,
      detail: `structural margin ${Math.round(outcome.final.hull)}`,
    },
    {
      label: 'Budget efficiency',
      points: Math.round(unspent * 200),
      max: 200,
      detail: `$${budget - cost}M of $${budget}M left unspent`,
    },
    {
      label: 'First-try bonus',
      points: timeline.parentId === null ? 100 : 0,
      max: 100,
      detail: timeline.parentId === null ? 'no Time Machine used on this timeline' : `branched from timeline ${timeline.parentName}`,
    },
  ];
  const total = lines.reduce((sum, line) => sum + line.points, 0);
  return {
    total,
    max: lines.reduce((sum, line) => sum + line.max, 0),
    rank: RANKS.find(([threshold]) => total >= threshold)![1],
    lines,
  };
}
