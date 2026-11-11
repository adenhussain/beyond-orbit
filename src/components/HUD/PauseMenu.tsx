import { Home, Play } from 'lucide-react';
import { useGame } from '../../state/useGame';
import { Button } from '../UI/Button';

const CONTROLS: [string, string][] = [
  ['A / ←', 'Move left'],
  ['D / →', 'Move right'],
  ['Space / W / ↑', 'Jump'],
  ['Shift', 'Sprint'],
  ['E', 'Interact'],
  ['Esc', 'Pause'],
];

/** Shown when the player presses Esc during gameplay. */
export function PauseMenu() {
  const { state, dispatch } = useGame();
  if (!state.paused) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-void/85" role="dialog" aria-modal="true" aria-label="Paused">
      <div className="panel w-full max-w-sm p-6">
        <h2 className="display text-center text-2xl font-black text-phosphor glow">PAUSED</h2>
        <dl className="mt-5 space-y-1.5 text-sm">
          {CONTROLS.map(([key, action]) => (
            <div key={key} className="flex justify-between">
              <dt className="border border-line px-2 text-cyan">{key}</dt>
              <dd className="text-ink/80">{action}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-col gap-2">
          <Button icon={<Play size={14} />} onClick={() => dispatch({ type: 'SET_PAUSED', paused: false })}>Resume</Button>
          <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}>Sound: {state.soundOn ? 'On' : 'Off'}</Button>
          <Button variant="ghost" icon={<Home size={14} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'menu' })}>
            Save &amp; Quit to Menu
          </Button>
        </div>
      </div>
    </div>
  );
}
