import { createContext } from 'react';
import type { Dispatch } from 'react';
import type { GameState } from '../types/gameState';
import type { Mission } from '../types/mission';
import type { BuildIssue, BuildStats } from '../types/spacecraft';
import type { Timeline } from '../types/timeline';
import type { GameAction } from './gameReducer';

export interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  mission: Mission | null;
  /** The timeline currently being played or viewed. */
  timeline: Timeline | null;
  /** Live engineering totals for the current design (null before a mission is chosen). */
  stats: BuildStats | null;
  issues: BuildIssue[];
}

// Kept in its own file (type-only imports) so hot reload never recreates it.
export const GameContext = createContext<GameContextValue | null>(null);
