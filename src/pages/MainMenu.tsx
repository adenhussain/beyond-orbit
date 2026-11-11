import { useMemo, useState } from 'react';
import { Info, MonitorPlay, Play, Rocket, Satellite, Settings, X } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Panel } from '../components/UI/Panel';
import { getMission } from '../data/missions';
import { lightDelay } from '../engine/lightTime';
import { describeWeather } from '../services/spaceWeather';
import { loadBestScores, loadSavedGame } from '../state/saveGame';
import { useGame } from '../state/useGame';

type Dialog = 'settings' | 'credits' | null;

const SCREEN_NAME: Record<string, string> = {
  briefing: 'Mission briefing', explore: 'Surface exploration', builder: 'Spacecraft workshop',
  launch: 'Launch', flight: 'In flight', outcome: 'Mission report', autopsy: 'Mission report', review: 'Mission report',
  missions: 'Mission selection',
};

export function MainMenu() {
  const { state, dispatch } = useGame();
  const [dialog, setDialog] = useState<Dialog>(null);
  const saved = useMemo(() => loadSavedGame(), []);
  const best = useMemo(() => loadBestScores(), []);
  const sw = state.spaceWeather;
  const marsDelay = lightDelay('mars');

  return (
    <div className="relative flex min-h-full flex-col items-center justify-center gap-8 overflow-hidden px-6 py-10">
      {/* Slow-moving planet and moon behind the logo */}
      <div className="menu-planet pointer-events-none absolute -bottom-72 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-[50%]" aria-hidden />
      <div className="menu-moon pointer-events-none absolute right-[12%] top-[14%] h-16 w-16 rounded-full" aria-hidden />

      <svg viewBox="0 0 200 200" className="relative h-40 w-40" aria-hidden>
        <defs>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#5dfc9a" stopOpacity="0" />
            <stop offset="1" stopColor="#5dfc9a" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        {[90, 62, 34].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1b3147" strokeWidth="1" />)}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#1b3147" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="#1b3147" />
        <g className="radar-sweep">
          <path d="M100 100 L190 100 A90 90 0 0 0 163.6 36.4 Z" fill="url(#sweep)" />
          <line x1="100" y1="100" x2="190" y2="100" stroke="#5dfc9a" strokeWidth="1.5" />
        </g>
        <ellipse cx="100" cy="100" rx="62" ry="22" fill="none" stroke="#74d4ff" strokeWidth="1" strokeDasharray="4 4" transform="rotate(-25 100 100)" />
        <circle cx="100" cy="100" r="9" fill="#0a1522" stroke="#5dfc9a" strokeWidth="1.5" />
        <circle cx="152" cy="74" r="3" fill="#ffb547" className="blink" />
      </svg>

      <div className="relative text-center">
        <p className="label mb-3 text-cyan">DEEP SPACE EXPLORATION AGENCY · FLIGHT CREW TERMINAL</p>
        <h1 className="display text-5xl font-black text-phosphor glow sm:text-7xl">BEYOND ORBIT</h1>
        <p className="mx-auto mt-4 max-w-xl text-ink/80">
          Walk the base. Gather the parts. Build the ship. Fly it, and when it goes wrong, go back in time and find out why.
        </p>
      </div>

      <nav className="relative flex w-full max-w-xs flex-col gap-2.5">
        <Button size="lg" icon={<Rocket size={16} />} onClick={() => { dispatch({ type: 'RESET' }); dispatch({ type: 'NAVIGATE', screen: 'missions' }); }}>
          Start New Mission
        </Button>
        <Button size="lg" variant="ghost" icon={<Play size={16} />} disabled={!saved} onClick={() => saved && dispatch({ type: 'LOAD_GAME', saved })}>
          Continue Mission
        </Button>
        {saved?.missionId && (
          <p className="-mt-1 text-center text-[11px] text-mute">
            {getMission(saved.missionId).name} · {SCREEN_NAME[saved.screen] ?? saved.screen}
          </p>
        )}
        <Button size="lg" variant="amber" icon={<MonitorPlay size={16} />} onClick={() => dispatch({ type: 'START_DEMO' })}>
          Demo Mission (3 min)
        </Button>
        <Button size="lg" variant="ghost" icon={<Settings size={16} />} onClick={() => setDialog('settings')}>Settings</Button>
        <Button size="lg" variant="ghost" icon={<Info size={16} />} onClick={() => setDialog('credits')}>Credits</Button>
      </nav>

      {/* Live data from NASA */}
      <section className="panel relative w-full max-w-2xl px-4 py-3 text-xs" aria-label="Live NASA data">
        <div className="label mb-1.5 flex items-center gap-1.5 !text-cyan">
          <Satellite size={12} /> Live from NASA ·{' '}
          {sw === null ? <span className="blink">contacting api.nasa.gov…</span> : sw.source === 'offline' ? 'offline' : sw.source === 'snapshot' ? 'saved snapshot' : sw.source === 'cached' ? 'recent' : 'live'}
        </div>
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          <div>
            <span className="text-mute">Solar storms (NASA DONKI): </span>
            {sw ? (
              <span className={sw.level === 'strong' ? 'text-alert' : sw.level === 'moderate' ? 'text-amber' : 'text-phosphor'}>
                {sw.source === 'offline' ? 'unavailable' : sw.level.toUpperCase()}
              </span>
            ) : '…'}
            <div className="text-ink/70">{sw ? describeWeather(sw) : 'Fetching recent solar flares.'}</div>
          </div>
          <div>
            <span className="text-mute">Radio delay to Mars today: </span>
            <span className="text-phosphor">{marsDelay.label}</span>
            <div className="text-ink/70">{(marsDelay.distanceKm / 1e6).toFixed(0)} million km away. Earth's advice reaches a Mars crew this late.</div>
          </div>
        </div>
        <p className="mt-1.5 text-[11px] text-mute">Real coronal mass ejections set the strength of the Mars radiation storm in your next mission.</p>
      </section>

      {(best.lunar || best.mars) && (
        <p className="label relative text-center">
          Best scores on this device · Lunar {best.lunar ?? '—'} · Mars {best.mars ?? '—'}
        </p>
      )}

      <p className="label relative text-center">Educational game with simplified engineering rules · Not a flight-certified tool</p>

      {dialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-void/85 p-4" role="dialog" aria-modal="true">
          <Panel
            title={dialog === 'settings' ? 'Settings' : 'Credits'}
            right={<button onClick={() => setDialog(null)} aria-label="Close" className="hover:text-cyan"><X size={14} /></button>}
            className="w-full max-w-md"
          >
            {dialog === 'settings' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">Sound effects</span>
                  <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_SOUND' })}>{state.soundOn ? 'On' : 'Off'}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">Music</span>
                  <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_SETTING', setting: 'musicOn' })}>{state.musicOn ? 'On' : 'Off'}</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink">CRT scanline effect</span>
                  <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_CRT' })}>{state.crtOn ? 'On' : 'Off'}</Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">Colour-blind palette<span className="block text-[11px] text-mute">Green becomes blue, red becomes magenta</span></span>
                  <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_SETTING', setting: 'colorBlind' })}>{state.colorBlind ? 'On' : 'Off'}</Button>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-ink">On-screen touch controls<span className="block text-[11px] text-mute">For tablets and phones</span></span>
                  <Button variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_SETTING', setting: 'touchControls' })}>{state.touchControls ? 'On' : 'Off'}</Button>
                </div>
                <dl className="border-t border-line pt-3 text-xs text-mute">
                  <div className="flex justify-between"><dt>Move</dt><dd>A / D or ← / →</dd></div>
                  <div className="flex justify-between"><dt>Jump</dt><dd>Space, W or ↑</dd></div>
                  <div className="flex justify-between"><dt>Sprint</dt><dd>Shift</dd></div>
                  <div className="flex justify-between"><dt>Interact</dt><dd>E</dd></div>
                  <div className="flex justify-between"><dt>Pause</dt><dd>Esc</dd></div>
                  <div className="mt-1 flex justify-between"><dt>Gamepad</dt><dd>Stick move · A jump · X interact · Start pause</dd></div>
                </dl>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-ink/85">
                <p><span className="text-phosphor">BEYOND ORBIT</span> — a 2D space exploration and spacecraft engineering game.</p>
                <p>Built for the NASA hackathon, November 2026.</p>
                <p className="text-xs text-mute">Game world: Phaser 3. Interface: React, TypeScript, Tailwind CSS. Icons: Lucide. Fonts: Orbitron, Share Tech Mono. All artwork and sound are generated in code.</p>
                <p className="text-xs text-mute">Live coronal mass ejection data: NASA DONKI via api.nasa.gov. Each challenge is based on a real event (Soyuz MS-22, Galileo, Apollo 13, Mars Odyssey, Perseverance, InSight).</p>
                <p className="text-xs text-mute">Mission numbers are simplified for teaching and are not real flight data.</p>
              </div>
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
