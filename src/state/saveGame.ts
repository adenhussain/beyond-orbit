import type { GameState } from '../types/gameState';

const KEY = 'beyond-orbit-save-v2';

/** Saves the whole game (mission, inventory, design, every timeline). */
export function saveGame(state: GameState): void {
  try {
    if (state.missionId && state.screen !== 'menu') localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the game still works, it just cannot be resumed.
  }
}

export function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as GameState;
    return saved && saved.missionId && saved.inventory ? saved : null;
  } catch {
    return null;
  }
}
