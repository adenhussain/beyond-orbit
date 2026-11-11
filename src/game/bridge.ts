import { initialGameState } from '../state/gameReducer';
import type { GameAction } from '../state/gameReducer';
import type { GameState } from '../types/gameState';

/** Suit readings owned by the exploration scene and shown by the React HUD. */
export interface SuitHud {
  suit: number;
  oxygen: number;
  zone: string;
}

/**
 * The bridge between React and Phaser.
 *
 * - React writes the latest game state here on every render.
 * - Phaser scenes read `bridge.state` each frame and call `bridge.dispatch`
 *   to change it (collect an item, open a console, ...).
 * - Scenes push fast-changing suit readings through `bridge.setHud`.
 *
 * Neither side imports the other, which keeps the game world and the
 * interface cleanly separated.
 */
export const bridge = {
  state: initialGameState as GameState,
  dispatch: (_action: GameAction): void => {},
  /** True while a React overlay is open: scenes ignore the keyboard. */
  inputLocked: false,
  setHud: (_hud: SuitHud): void => {},
};
