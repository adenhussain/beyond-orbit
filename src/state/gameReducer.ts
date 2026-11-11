import { getMission } from '../data/missions';
import { emptyInventory } from '../data/resources';
import { emptyBuild } from '../data/spacecraftComponents';
import { toggleComponent } from '../engine/buildEditor';
import {
  arriveAtNextPoint,
  branchTimeline,
  continueAfterDecision,
  createOriginalTimeline,
  makeDecision,
  serviceOxygen,
} from '../engine/timelineManager';
import type { GameState, Screen } from '../types/gameState';
import type { ResourceId, RoomId } from '../types/resources';
import type { Build } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';

/**
 * The reducer is the only place where game state changes. It holds no game
 * rules itself: it calls the engine and stores what the engine returns.
 * Both React screens and Phaser scenes send their actions here.
 */

export type GameAction =
  | { type: 'NAVIGATE'; screen: Screen }
  | { type: 'SELECT_MISSION'; missionId: string }
  | { type: 'COLLECT'; itemId: string; resource: ResourceId }
  | { type: 'ENTER_WORKSHOP' }
  | { type: 'TOGGLE_COMPONENT'; componentId: string }
  | { type: 'LOAD_BUILD'; build: Build }
  | { type: 'LAUNCH' }
  | { type: 'ARRIVE' }
  | { type: 'OPEN_CHALLENGE' }
  | { type: 'DECIDE'; optionId: 'A' | 'B' }
  | { type: 'CONTINUE' }
  | { type: 'OPEN_PANEL'; room: RoomId | null }
  | { type: 'SERVICE_OXYGEN' }
  | { type: 'REWIND'; timelineId: string; challengeIndex: number }
  | { type: 'SET_ACTIVE_TIMELINE'; timelineId: string }
  | { type: 'TIME_MACHINE'; open: boolean }
  | { type: 'SET_PAUSED'; paused: boolean }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_CRT' }
  | { type: 'LOAD_GAME'; saved: GameState }
  | { type: 'RESET' };

export const initialGameState: GameState = {
  screen: 'menu',
  missionId: null,
  build: emptyBuild(),
  timelines: [],
  activeTimelineId: null,
  timeMachineOpen: false,
  soundOn: true,
  crtOn: true,
  inventory: emptyInventory(),
  collected: [],
  atWorkshop: false,
  challengeOpen: false,
  systemPanel: null,
  paused: false,
};

/** Runs an engine step on the active timeline and stores the result. */
function updateActive(state: GameState, step: (t: Timeline) => Timeline): GameState {
  const timelines = state.timelines.map((t) => (t.id === state.activeTimelineId ? step(t) : t));
  const active = timelines.find((t) => t.id === state.activeTimelineId);
  const finished = active?.stage === 'complete';
  return { ...state, timelines, screen: finished ? 'outcome' : state.screen };
}

const closed = { timeMachineOpen: false, challengeOpen: false, systemPanel: null, paused: false } as const;

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NAVIGATE':
      return { ...state, ...closed, screen: action.screen };

    case 'SELECT_MISSION':
      // A different mission is a different world: start with empty pockets.
      if (action.missionId === state.missionId) return { ...state, screen: 'briefing' };
      return {
        ...state,
        missionId: action.missionId,
        build: emptyBuild(),
        inventory: emptyInventory(),
        collected: [],
        atWorkshop: false,
        timelines: [],
        activeTimelineId: null,
        screen: 'briefing',
      };

    case 'COLLECT':
      if (state.collected.includes(action.itemId)) return state;
      return {
        ...state,
        collected: [...state.collected, action.itemId],
        inventory: { ...state.inventory, [action.resource]: state.inventory[action.resource] + 1 },
      };

    case 'ENTER_WORKSHOP':
      return { ...state, ...closed, atWorkshop: true, screen: 'builder' };

    case 'TOGGLE_COMPONENT':
      return { ...state, build: toggleComponent(state.build, action.componentId) };

    case 'LOAD_BUILD':
      return { ...state, build: structuredClone(action.build) };

    case 'LAUNCH': {
      if (!state.missionId) return state;
      // Repair kits are not used in construction, so all of them come aboard.
      const timeline = createOriginalTimeline(getMission(state.missionId), state.build, state.inventory.repair);
      return { ...state, ...closed, timelines: [timeline], activeTimelineId: timeline.id, screen: 'launch' };
    }

    case 'ARRIVE': {
      const mission = getMission(state.missionId!);
      return updateActive({ ...state, challengeOpen: false }, (t) => arriveAtNextPoint(t, mission));
    }
    case 'OPEN_CHALLENGE':
      return { ...state, challengeOpen: true, systemPanel: null };
    case 'DECIDE': {
      const mission = getMission(state.missionId!);
      return updateActive(state, (t) => makeDecision(t, mission, action.optionId));
    }
    case 'CONTINUE': {
      const mission = getMission(state.missionId!);
      return updateActive({ ...state, challengeOpen: false }, (t) => continueAfterDecision(t, mission));
    }

    case 'OPEN_PANEL':
      return { ...state, systemPanel: action.room };
    case 'SERVICE_OXYGEN':
      return updateActive(state, serviceOxygen);

    case 'REWIND': {
      // TIME MACHINE: add a new timeline; every existing one stays as it was.
      const source = state.timelines.find((t) => t.id === action.timelineId);
      if (!source || !state.missionId) return state;
      const branch = branchTimeline(
        source, getMission(state.missionId), action.challengeIndex, state.timelines.length,
      );
      if (!branch) return state;
      return {
        ...state,
        ...closed,
        timelines: [...state.timelines, branch],
        activeTimelineId: branch.id,
        screen: 'flight',
      };
    }

    case 'SET_ACTIVE_TIMELINE': {
      const target = state.timelines.find((t) => t.id === action.timelineId);
      if (!target) return state;
      return {
        ...state,
        ...closed,
        activeTimelineId: target.id,
        screen: target.stage === 'complete' ? 'outcome' : 'flight',
      };
    }

    case 'TIME_MACHINE':
      return { ...state, timeMachineOpen: action.open, systemPanel: null };
    case 'SET_PAUSED':
      return { ...state, paused: action.paused };
    case 'TOGGLE_SOUND':
      return { ...state, soundOn: !state.soundOn };
    case 'TOGGLE_CRT':
      return { ...state, crtOn: !state.crtOn };
    case 'LOAD_GAME':
      return {
        ...initialGameState,
        ...action.saved,
        ...closed,
        // The launch cinematic cannot be resumed half-way; go straight aboard.
        screen: action.saved.screen === 'launch' ? 'flight' : action.saved.screen,
      };
    case 'RESET':
      return { ...initialGameState, soundOn: state.soundOn, crtOn: state.crtOn };
  }
}
