import { useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { getMission } from '../data/missions';
import { calculateBuildStats, validateBuild } from '../engine/resourceCalculator';
import { setSoundEnabled } from '../services/sound';
import { GameContext } from './gameContextObject';
import type { GameContextValue } from './gameContextObject';
import { gameReducer, initialGameState } from './gameReducer';
import { saveGame } from './saveGame';

/** Holds the whole game state and shares it with every screen. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  const value = useMemo<GameContextValue>(() => {
    const mission = state.missionId ? getMission(state.missionId) : null;
    const stats = mission ? calculateBuildStats(state.build, mission) : null;
    return {
      state,
      dispatch,
      mission,
      timeline: state.timelines.find((t) => t.id === state.activeTimelineId) ?? null,
      stats,
      issues: mission && stats ? validateBuild(state.build, mission, stats, state.inventory) : [],
    };
  }, [state]);

  useEffect(() => setSoundEnabled(state.soundOn), [state.soundOn]);
  // Autosave so "Continue Mission" can resume later.
  useEffect(() => saveGame(state), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
