import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ChevronsUp, Hand, Pause, Zap } from 'lucide-react';
import { touchState } from '../../game/input';
import { useGame } from '../../state/useGame';

type TouchKey = keyof typeof touchState;

function HoldButton({ control, label, children, wide = false }: { control: TouchKey; label: string; children: ReactNode; wide?: boolean }) {
  const set = (value: boolean) => () => { touchState[control] = value; };
  return (
    <button
      type="button"
      aria-label={label}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); touchState[control] = true; }}
      onPointerUp={set(false)}
      onPointerCancel={set(false)}
      onPointerLeave={set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={`flex select-none items-center justify-center border border-line-hi bg-navy/70 text-ink active:border-phosphor active:bg-phosphor/25 active:text-phosphor ${wide ? 'h-16 w-20' : 'h-16 w-16'}`}
      style={{ touchAction: 'none' }}
    >
      {children}
    </button>
  );
}

/** On-screen buttons for tablets and phones. They feed the same input as a gamepad. */
export function TouchControls() {
  const { state, dispatch } = useGame();

  // Never leave a button "stuck" when the controls disappear.
  useEffect(() => () => {
    for (const key of Object.keys(touchState) as TouchKey[]) touchState[key] = false;
  }, []);

  if (!state.touchControls) return null;
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-8 z-30 flex items-end justify-between">
      <div className="pointer-events-auto flex gap-2">
        <HoldButton control="left" label="Move left"><ChevronLeft size={28} /></HoldButton>
        <HoldButton control="right" label="Move right"><ChevronRight size={28} /></HoldButton>
        <HoldButton control="sprint" label="Sprint"><Zap size={20} /></HoldButton>
      </div>
      <div className="pointer-events-auto flex items-end gap-2">
        <button
          type="button" aria-label="Pause"
          onClick={() => dispatch({ type: 'SET_PAUSED', paused: true })}
          className="flex h-11 w-11 items-center justify-center border border-line bg-navy/70 text-mute"
        >
          <Pause size={16} />
        </button>
        <HoldButton control="interact" label="Interact" wide><Hand size={22} /><span className="ml-1 text-xs">E</span></HoldButton>
        <HoldButton control="jump" label="Jump" wide><ChevronsUp size={26} /></HoldButton>
      </div>
    </div>
  );
}
