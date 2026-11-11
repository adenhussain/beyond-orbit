import { REFERENCE_BUILDS } from '../data/presets';
import { emptyInventory } from '../data/resources';
import { lunarMap } from '../game/maps/lunarMap';
import type { GameState } from '../types/gameState';

/**
 * DEMO MISSION — a guided 3-minute run for presentations.
 *
 * The astronaut starts near the workshop with almost every supply already
 * collected; three items are left in the world so the audience sees the
 * collect mechanic. The reference spacecraft is pre-designed and uses exactly
 * what is available. Everything after that is the normal game.
 */

/** Items left in the world for the demo, all a few steps from the spawn point. */
export const DEMO_ITEMS_LEFT = ['l-str5', 'l-pwr5', 'l-thm3'];
export const DEMO_SPAWN_X = 4300;

export function startDemo(base: GameState): GameState {
  const inventory = emptyInventory();
  const collected: string[] = [];
  for (const item of lunarMap.resources) {
    if (DEMO_ITEMS_LEFT.includes(item.id)) continue;
    collected.push(item.id);
    inventory[item.type] += 1;
  }
  return {
    ...base,
    demo: true,
    missionId: 'lunar',
    screen: 'explore',
    inventory,
    collected,
    atWorkshop: false,
    build: structuredClone(REFERENCE_BUILDS.lunar),
    timelines: [],
    activeTimelineId: null,
  };
}

export interface DemoStep {
  step: number;
  total: number;
  text: string;
}

/** The presenter's next step, worked out from the current game state. */
export function demoStep(state: GameState): DemoStep {
  const total = 7;
  const timeline = state.timelines.find((t) => t.id === state.activeTimelineId);
  const at = (step: number, text: string): DemoStep => ({ step, total, text });

  if (state.screen === 'explore') {
    return at(1, 'Walk right (D), jump (Space) and press E on the three glowing supplies, then press E at the workshop door.');
  }
  if (state.screen === 'builder') {
    return at(2, 'The ship is pre-designed from the supplies you collected. Point out the live status and debt, then press Review & Launch.');
  }
  if (state.screen === 'launch') return at(3, 'Launch. Skip to Flight when ready.');
  if (state.screen === 'flight' && timeline) {
    if (state.timelines.length > 1) {
      return at(6, `Timeline ${timeline.name}: play the alternative. Time warp is on. Respond to each alarm in its room.`);
    }
    const index = timeline.challengeIndex;
    if (timeline.stage === 'cruise') return at(4, 'Walk around the ship. Time warp is on; an alarm will sound shortly.');
    const advice = [
      'Follow the red arrows to the alarm room, press E. Choose Option A (isolate the loop).',
      'Choose Option B, Emergency Comm Mode. This is the butterfly: watch where it leads.',
      'The off-target landing cut the power. Choose Option B, backup power, and watch the battery.',
    ][Math.min(2, index)];
    return at(5, advice);
  }
  if (state.screen === 'outcome' || state.screen === 'autopsy' || state.screen === 'review') {
    if (state.timelines.length > 1) {
      return at(7, 'Open the Time Machine to compare both timelines side by side: same ship, one different decision.');
    }
    return at(6, 'Open the Damage Analysis to show the chain of cause and effect, then the Time Machine: rewind Challenge 2 and choose Reorient.');
  }
  return at(1, 'Demo running.');
}
