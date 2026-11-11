import { describe, expect, it } from 'vitest';
import { HISTORY } from '../data/history';
import { CHALLENGES } from '../data/challenges';
import { getMission } from '../data/missions';
import { REFERENCE_BUILDS } from '../data/presets';
import { buildMaterials } from '../data/resources';
import { lunarMap } from '../game/maps/lunarMap';
import { summariseCmes } from '../services/spaceWeather';
import { startDemo } from '../state/demo';
import { initialGameState } from '../state/gameReducer';
import type { SpaceWeather } from '../types/spaceWeather';
import { analysisWaitSeconds, earthMarsDistanceAU, lightDelay } from './lightTime';
import { scoreMission } from './missionScore';
import { arriveAtNextPoint, continueAfterDecision, createOriginalTimeline, makeDecision } from './timelineManager';

const weather = (level: SpaceWeather['level']): SpaceWeather => ({
  source: 'live', level, eventCount: 40, fastestSpeed: level === 'strong' ? 1800 : 600, fastestType: level === 'strong' ? 'O' : 'C',
  fastestDate: '2026-11-01', windowDays: 30, fetchedAt: '2026-11-11T00:00:00Z',
});

describe('live space weather', () => {
  it('summarises a DONKI CME list using the fastest most-accurate analysis', () => {
    const cme = (speed: number, date: string, accurate = true) => ({
      startTime: `${date}T01:00Z`, cmeAnalyses: [{ speed: speed - 300, isMostAccurate: false }, { speed, type: 'O', isMostAccurate: accurate }],
    });
    const sw = summariseCmes([cme(700, '2026-10-20'), cme(1600, '2026-11-02'), { startTime: '2026-11-03', cmeAnalyses: null }], 'live');
    expect(sw.level).toBe('strong');
    expect(sw.fastestSpeed).toBe(1600);
    expect(sw.fastestDate).toBe('2026-11-02');
    expect(sw.eventCount).toBe(3);
    expect(summariseCmes([cme(1048, '2026-11-01')], 'live').level).toBe('moderate');
    expect(summariseCmes([], 'live').level).toBe('quiet');
  });

  it('real solar activity changes the Mars storm, deterministically', () => {
    const mission = getMission('mars');
    const reach = (sw?: SpaceWeather) => arriveAtNextPoint(createOriginalTimeline(mission, REFERENCE_BUILDS.mars, 1, sw), mission);
    const quiet = reach(weather('quiet'));
    const strong = reach(weather('strong'));
    expect(strong.state.debt.reliability).toBe(quiet.state.debt.reliability + 10);
    expect(strong.state.spaceWeather?.fastestSpeed).toBe(1800);
    expect(reach(weather('strong')).state).toEqual(strong.state);
    // Offline play is unchanged from the original game.
    expect(reach(undefined).state.debt.reliability).toBe(quiet.state.debt.reliability);
  });
});

describe('radio delay', () => {
  it('follows the real Earth–Mars cycle', () => {
    expect(earthMarsDistanceAU(new Date(Date.UTC(2025, 0, 16)))).toBeCloseTo(0.524, 2); // opposition
    expect(earthMarsDistanceAU(new Date(Date.UTC(2026, 0, 9)))).toBeGreaterThan(2.3); // near conjunction
    const delay = lightDelay('mars', new Date(Date.UTC(2026, 10, 14)));
    expect(delay.oneWaySeconds / 60).toBeGreaterThan(3);
    expect(delay.oneWaySeconds / 60).toBeLessThan(23);
    expect(lightDelay('lunar').oneWaySeconds).toBeCloseTo(1.28, 1);
    expect(analysisWaitSeconds(lightDelay('lunar'))).toBe(0);
    expect(analysisWaitSeconds(delay)).toBeGreaterThan(5);
  });
});

describe('history cards', () => {
  it('every challenge has a real event attached', () => {
    for (const challenge of CHALLENGES) expect(HISTORY[challenge.id], challenge.id).toBeDefined();
  });
});

describe('demo mission', () => {
  it('starts with exactly the supplies the reference ship needs after three pickups', () => {
    const demo = startDemo(initialGameState);
    const needed = buildMaterials(demo.build);
    const leftInWorld = lunarMap.resources.filter((r) => !demo.collected.includes(r.id));
    expect(leftInWorld).toHaveLength(3);
    const after = { ...demo.inventory };
    for (const item of leftInWorld) after[item.type] += 1;
    for (const key of Object.keys(needed) as (keyof typeof needed)[]) {
      if (key !== 'repair') expect(after[key], key).toBeGreaterThanOrEqual(needed[key]);
    }
  });
});

describe('mission score', () => {
  it('rewards a successful mission more than a partial one', () => {
    const mission = getMission('lunar');
    const fly = (choices: ('A' | 'B')[]) => {
      let tl = createOriginalTimeline(mission, REFERENCE_BUILDS.lunar, 2);
      for (let guard = 0; guard < 20 && tl.stage !== 'complete'; guard++) {
        if (tl.stage === 'cruise') tl = arriveAtNextPoint(tl, mission);
        else if (tl.stage === 'challenge') tl = makeDecision(tl, mission, choices[tl.challengeIndex]);
        else tl = continueAfterDecision(tl, mission);
      }
      return tl;
    };
    const success = scoreMission(fly(['A', 'A', 'B']), 205, 230)!;
    const partial = scoreMission(fly(['A', 'B', 'B']), 205, 230)!;
    expect(success.total).toBeGreaterThan(partial.total);
    expect(success.lines.find((l) => l.label === 'First-try bonus')!.points).toBe(100);
    expect(success.total).toBeLessThanOrEqual(success.max);
  });
});
