import { useContext } from 'react';
import { GameContext } from './gameContextObject';
import type { GameContextValue } from './gameContextObject';

/** Access the game state and dispatch from any component. */
export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (!value) throw new Error('useGame must be used inside <GameProvider>');
  return value;
}
