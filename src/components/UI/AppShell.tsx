import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { GitBranch, Home, Volume2, VolumeX } from 'lucide-react';
import { useGame } from '../../state/useGame';
import type { Screen } from '../../types/gameState';
import { Starfield } from './Starfield';

const SCREEN_LABEL: Record<Screen, string> = {
  menu: 'STANDBY',
  missions: 'MISSION COMMAND',
  briefing: 'MISSION BRIEFING',
  explore: 'SURFACE EXPLORATION',
  builder: 'SPACECRAFT WORKSHOP',
  launch: 'LAUNCH SEQUENCE',
  flight: 'FLIGHT OPERATIONS',
  outcome: 'MISSION REPORT',
  autopsy: 'FAILURE AUTOPSY',
  review: 'REVIEW BOARD',
};

function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now.toISOString().slice(11, 19);
}

/** Frame shared by every screen: sky, status bar and CRT overlay. */
export function AppShell({ children }: { children: ReactNode }) {
  const { state, dispatch, mission, timeline } = useGame();
  const clock = useClock();

  return (
    <div className="relative flex h-full flex-col">
      <Starfield />
      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-line bg-navy/90 px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="display text-sm font-bold text-phosphor glow">BEYOND ORBIT</span>
          <span className="label hidden sm:inline">// {SCREEN_LABEL[state.screen]}</span>
          {mission && state.screen !== 'menu' && (
            <span className="label hidden text-cyan md:inline">{mission.codename}</span>
          )}
          {timeline && (
            <span className="label hidden items-center gap-1 text-amber md:flex">
              <GitBranch size={12} /> TIMELINE {timeline.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="label tabular-nums">UTC {clock}</span>
          <button
            className="text-mute transition-colors hover:text-cyan"
            onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}
            aria-label={state.soundOn ? 'Mute sound' : 'Enable sound'}
            title={state.soundOn ? 'Mute sound' : 'Enable sound'}
          >
            {state.soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          {state.screen !== 'menu' && (
            <button
              className="text-mute transition-colors hover:text-cyan"
              onClick={() => {
                dispatch({ type: 'NAVIGATE', screen: 'menu' });
              }}
              aria-label="Save and return to main menu"
              title="Save and return to main menu"
            >
              <Home size={16} />
            </button>
          )}
        </div>
      </header>
      <main className="relative z-10 min-h-0 flex-1 overflow-auto">{children}</main>
      {state.crtOn && <div className="scan-bar" />}
      {state.crtOn && <div className="crt-overlay" />}
    </div>
  );
}
