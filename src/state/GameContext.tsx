import { useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { getMission } from '../data/missions';
import { calculateBuildStats, validateBuild } from '../engine/resourceCalculator';
import { music } from '../services/music';
import type { Mood } from '../services/music';
import { setSoundEnabled } from '../services/sound';
import { fetchSpaceWeather } from '../services/spaceWeather';
import type { GameState } from '../types/gameState';
import { GameContext } from './gameContextObject';
import type { GameContextValue } from './gameContextObject';
import { gameReducer, initialGameState } from './gameReducer';
import { loadPreferences, saveGame, savePreferences } from './saveGame';

/** Which soundtrack fits the current moment. */
function moodFor(state: GameState): Mood {
  const timeline = state.timelines.find((t) => t.id === state.activeTimelineId);
  switch (state.screen) {
    case 'menu': case 'missions': case 'briefing': return 'menu';
    case 'explore': case 'builder': return 'explore';
    case 'launch': return 'ship';
    case 'flight': return timeline?.stage === 'challenge' ? 'alert' : 'ship';
    default: return timeline?.outcome?.result === 'failure' ? 'failure' : 'success';
  }
}

/** Holds the whole game state and shares it with every screen. */
export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (init) => ({ ...init, ...loadPreferences() }));

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

  // Live NASA space weather, fetched once at start-up (falls back to offline).
  useEffect(() => {
    let cancelled = false;
    void fetchSpaceWeather().then((spaceWeather) => {
      if (!cancelled) dispatch({ type: 'SET_SPACE_WEATHER', spaceWeather });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => setSoundEnabled(state.soundOn), [state.soundOn]);
  useEffect(() => music.setEnabled(state.musicOn), [state.musicOn]);
  const mood = moodFor(state);
  useEffect(() => music.setMood(mood), [mood]);

  // Colour-blind palette is a set of CSS variables on the page root.
  useEffect(() => {
    document.documentElement.dataset.palette = state.colorBlind ? 'colorblind' : 'default';
  }, [state.colorBlind]);

  // Autosave so "Continue Mission" can resume later; settings are kept separately.
  useEffect(() => saveGame(state), [state]);
  useEffect(
    () => savePreferences(state),
    [state.soundOn, state.musicOn, state.crtOn, state.colorBlind, state.touchControls],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
