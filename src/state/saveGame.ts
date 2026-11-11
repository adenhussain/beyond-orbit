import type { GameState } from '../types/gameState';

const KEY = 'beyond-orbit-save-v2';
const PREFS_KEY = 'beyond-orbit-preferences';

/** Saves the whole game (mission, inventory, design, every timeline). */
export function saveGame(state: GameState): void {
  // The guided demo never overwrites the player's real save.
  if (state.demo) return;
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

type Preferences = Pick<GameState, 'soundOn' | 'musicOn' | 'crtOn' | 'colorBlind' | 'touchControls'>;

export function savePreferences(state: GameState): void {
  const { soundOn, musicOn, crtOn, colorBlind, touchControls } = state;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ soundOn, musicOn, crtOn, colorBlind, touchControls }));
  } catch {
    // ignore
  }
}

export function loadPreferences(): Partial<Preferences> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw) as Partial<Preferences>;
  } catch {
    // ignore
  }
  // First visit: offer touch controls automatically on touch screens.
  const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  return touch ? { touchControls: true } : {};
}

/** Best mission score per mission, kept on this device. */
const SCORES_KEY = 'beyond-orbit-best-scores';

export function loadBestScores(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SCORES_KEY) ?? '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

/** Records a score; returns the previous best (0 if none). */
export function recordScore(missionId: string, score: number): number {
  const scores = loadBestScores();
  const previous = scores[missionId] ?? 0;
  if (score > previous) {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify({ ...scores, [missionId]: score }));
    } catch {
      // ignore
    }
  }
  return previous;
}
