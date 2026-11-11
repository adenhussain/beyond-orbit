import { describe, expect, it } from 'vitest';
import { getMission } from '../data/missions';
import { REFERENCE_BUILDS } from '../data/presets';
import type { Build } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';
import { getChallenge, getLockReason } from './challengeManager';
import { analyzeFailure } from './failureAnalyzer';
import { calculateBuildStats, canLaunch, validateBuild } from './resourceCalculator';
import {
  arriveAtNextPoint,
  branchTimeline,
  continueAfterDecision,
  createOriginalTimeline,
  makeDecision,
  rewindPoints,
} from './timelineManager';

type Choice = 'A' | 'B';

const BUDGET_BUILDS: Record<string, Build> = {
  lunar: {
    bus: ['bus_light'], thermal: ['th_mli'], generation: ['pw_solar_s'], storage: ['bat_s'],
    instruments: ['sci_neutron', 'sci_cam'], antenna: ['com_mga'], backup: [],
    engine: ['eng_mono'], tank: ['tank_m'], cpu: ['cpu_basic'], nav: ['nav_imu'],
  },
  mars: {
    bus: ['bus_light'], thermal: ['th_mli'], generation: ['pw_solar_l'], storage: ['bat_s'],
    instruments: ['sci_drill', 'sci_cam'], antenna: ['com_mga'], backup: ['com_uhf'],
    engine: ['eng_mono'], tank: ['tank_m'], cpu: ['cpu_basic'], nav: ['nav_imu'],
  },
};

const PREMIUM_BUILDS: Record<string, Build> = {
  lunar: {
    bus: ['bus_std'], thermal: ['th_active'], generation: ['pw_solar_l'], storage: ['bat_m'],
    instruments: ['sci_neutron', 'sci_drill', 'sci_spec'], antenna: ['com_hga'], backup: [],
    engine: ['eng_biprop'], tank: ['tank_m'], cpu: ['cpu_rad'], nav: ['nav_star'],
  },
  mars: {
    bus: ['bus_std'], thermal: ['th_loop'], generation: ['pw_solar_l'], storage: ['bat_l'],
    instruments: ['sci_drill', 'sci_spec', 'sci_radar'], antenna: ['com_hga'], backup: ['com_uhf'],
    engine: ['eng_biprop'], tank: ['tank_m'], cpu: ['cpu_rad'], nav: ['nav_trn'],
  },
};

/** Plays a whole mission with the given choices (falls back if one is locked). */
function play(missionId: string, build: Build, choices: Choice[]): Timeline {
  const mission = getMission(missionId);
  let tl = createOriginalTimeline(mission, build, 2); // two repair kits aboard
  for (let guard = 0; guard < 20 && tl.stage !== 'complete'; guard++) {
    if (tl.stage === 'cruise') tl = arriveAtNextPoint(tl, mission);
    else if (tl.stage === 'challenge') {
      const challenge = getChallenge(missionId, tl.challengeIndex);
      let pick = choices[tl.challengeIndex];
      const option = challenge.options.find((o) => o.id === pick)!;
      if (getLockReason(tl.state, mission, option)) pick = pick === 'A' ? 'B' : 'A';
      tl = makeDecision(tl, mission, pick);
    } else tl = continueAfterDecision(tl, mission);
  }
  return tl;
}

const ALL_PATHS: Choice[][] = [];
for (const a of ['A', 'B'] as Choice[])
  for (const b of ['A', 'B'] as Choice[])
    for (const c of ['A', 'B'] as Choice[]) ALL_PATHS.push([a, b, c]);

describe.each(['lunar', 'mars'])('%s mission', (missionId) => {
  const mission = getMission(missionId);
  const builds = {
    reference: REFERENCE_BUILDS[missionId],
    budget: BUDGET_BUILDS[missionId],
    premium: PREMIUM_BUILDS[missionId],
  };

  it('all test builds are launchable', () => {
    for (const [name, build] of Object.entries(builds)) {
      const stats = calculateBuildStats(build, mission);
      const issues = validateBuild(build, mission, stats);
      const blocks = issues.filter((i) => i.level === 'block').map((i) => `${i.title}: ${i.detail}`);
      console.log(
        `[${missionId}/${name}] cost $${stats.cost}M/${stats.budget} wet ${Math.round(stats.wetMass)}/${stats.maxMass}kg ` +
        `fuel ${stats.fuelLoaded}/${Math.round(stats.fuelRequired)} pwr ${Math.round(stats.powerGen)}/${stats.powerDraw}W ` +
        `twr ${stats.twr.toFixed(2)} sci ${stats.sciencePoints} data ${stats.dataGeneratedGB}GB link ${stats.commCapacityGB.toFixed(1)}GB`,
        blocks,
      );
      expect(canLaunch(issues), `${name}: ${blocks.join(' | ')}`).toBe(true);
    }
  });

  it('every decision path completes with a calculated outcome', () => {
    const results = new Set<string>();
    for (const [name, build] of Object.entries(builds)) {
      for (const path of ALL_PATHS) {
        const tl = play(missionId, build, path);
        expect(tl.stage).toBe('complete');
        expect(tl.outcome).not.toBeNull();
        const o = tl.outcome!;
        results.add(o.result);
        const taken = tl.decisions.map((d) => d.optionId).join('');
        console.log(
          `[${missionId}/${name}] ${taken.padEnd(3)} -> ${o.result.padEnd(8)} sci ${o.sciencePct.toFixed(0).padStart(3)}% ` +
          `fuel ${Math.round(o.final.fuel)}kg batt ${o.final.batteryPct.toFixed(0)}% hull ${Math.round(o.final.hull)} ` +
          `debt T${o.final.debt.thermal} P${o.final.debt.power} R${o.final.debt.reliability} C${o.final.debt.comm}` +
          (o.criticals.length ? ` !! ${o.criticals.map((c) => c.title).join(', ')}` : ''),
        );
        if (o.result !== 'success') {
          const autopsy = analyzeFailure(tl, mission);
          expect(autopsy).not.toBeNull();
          expect(autopsy!.recommendations.length).toBeGreaterThan(0);
        }
      }
    }
    // The design space must contain all three outcomes.
    expect(results).toEqual(new Set(['success', 'partial', 'failure']));
  });

  it('the simulation is deterministic', () => {
    const a = play(missionId, builds.reference, ['B', 'A', 'B']);
    const b = play(missionId, builds.reference, ['B', 'A', 'B']);
    expect(a.outcome).toEqual(b.outcome);
    expect(a.state).toEqual(b.state);
  });

  it('the two options of each challenge change the state differently', () => {
    for (const first of ['A', 'B'] as Choice[]) {
      const a = play(missionId, builds.reference, [first, 'A', 'A']);
      const b = play(missionId, builds.reference, [first, 'B', 'A']);
      expect(a.state).not.toEqual(b.state);
    }
    expect(play(missionId, builds.reference, ['A', 'A', 'A']).state).not.toEqual(
      play(missionId, builds.reference, ['B', 'A', 'A']).state,
    );
  });

  it('Time Machine restores the exact state and preserves the original timeline', () => {
    const original = play(missionId, builds.reference, ['A', 'B', 'A']);
    const frozen = structuredClone(original);
    expect(rewindPoints(original)).toEqual([0, 1, 2]);

    for (const index of rewindPoints(original)) {
      const first = original.decisions[index].optionId;
      const other = first === 'A' ? 'B' : 'A';
      const branch = branchTimeline(original, mission, index, 1)!;
      expect(branch).not.toBeNull();
      const snapshot = original.snapshots.find((s) => s.challengeIndex === index)!;
      expect(branch.state).toEqual(snapshot.state); // exact restore
      expect(branch.state).not.toBe(snapshot.state); // independent copy
      expect(branch.decisions.length).toBe(index);
      expect(branch.stage).toBe('challenge');
      expect(branch.lockedOption).toEqual({ challengeIndex: index, optionId: first });

      // Play the alternative to the end.
      let tl = makeDecision(branch, mission, other);
      for (let guard = 0; guard < 20 && tl.stage !== 'complete'; guard++) {
        if (tl.stage === 'cruise') tl = arriveAtNextPoint(tl, mission);
        else if (tl.stage === 'challenge') tl = makeDecision(tl, mission, 'A');
        else tl = continueAfterDecision(tl, mission);
      }
      expect(tl.stage).toBe('complete');
      expect(tl.decisions[index].optionId).toBe(other);
      expect(tl.state).not.toEqual(original.state);
    }
    expect(original).toEqual(frozen); // the original was never touched
  });
});
