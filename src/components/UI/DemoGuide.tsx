import { MonitorPlay, X } from 'lucide-react';
import { demoStep } from '../../state/demo';
import { useGame } from '../../state/useGame';

/** The presenter's script, shown along the top of the screen during the demo. */
export function DemoGuide() {
  const { state, dispatch } = useGame();
  if (!state.demo || state.screen === 'menu') return null;
  const { step, total, text } = demoStep(state);
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-3 border-b border-amber/60 bg-amber/10 px-4 py-1.5 text-xs">
      <MonitorPlay size={14} className="shrink-0 text-amber" />
      <span className="label shrink-0 !text-amber">Demo {step}/{total}</span>
      <span className="min-w-0 flex-1 text-ink">{text}</span>
      <button
        onClick={() => dispatch({ type: 'EXIT_DEMO' })}
        className="flex shrink-0 items-center gap-1 text-mute hover:text-cyan"
        aria-label="Exit demo"
      >
        <X size={13} /> Exit demo
      </button>
    </div>
  );
}
