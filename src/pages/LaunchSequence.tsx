import { useEffect, useRef, useState } from 'react';
import { FastForward } from 'lucide-react';
import { Button } from '../components/UI/Button';
import { Panel } from '../components/UI/Panel';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';

const POLL = ['STRUCTURES', 'POWER', 'PAYLOAD', 'COMMS', 'PROPULSION', 'GUIDANCE'];
const POLL_END = 3; // seconds
const COUNT_END = POLL_END + 6;
const ASCENT_END = COUNT_END + 6;

/** Go/no-go poll, countdown and ascent. Purely presentational: the flight
 *  state was already created by the engine when LAUNCH was dispatched. */
export function LaunchSequence() {
  const { dispatch, mission, stats } = useGame();
  const [time, setTime] = useState(0);
  const lastBeep = useRef(-1);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setTime((Date.now() - started) / 1000), 50);
    return () => clearInterval(timer);
  }, []);

  const counting = time >= POLL_END && time < COUNT_END;
  const ascending = time >= COUNT_END;
  const count = Math.max(0, Math.ceil(COUNT_END - time) - 1);
  const ascent = Math.min(1, Math.max(0, (time - COUNT_END) / (ASCENT_END - COUNT_END)));

  // Sound cues, each fired once.
  useEffect(() => {
    if (counting && count !== lastBeep.current) {
      lastBeep.current = count;
      sound.countdown();
    }
    if (ascending && lastBeep.current !== -99) {
      lastBeep.current = -99;
      sound.ignition();
      sound.rumble(ASCENT_END - COUNT_END);
    }
  }, [counting, ascending, count]);

  useEffect(() => {
    if (time >= ASCENT_END + 1.2) dispatch({ type: 'NAVIGATE', screen: 'flight' });
  }, [time, dispatch]);

  if (!mission || !stats) return null;
  const altitude = Math.round(ascent * ascent * 185);
  const velocity = Math.round(ascent * 7800);

  return (
    <div className="mx-auto grid min-h-full max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_320px]">
      <Panel title={`Launch Pad — ${mission.codename}`} right={ascending ? 'ASCENT' : counting ? 'TERMINAL COUNT' : 'GO / NO-GO POLL'} bodyClassName="relative overflow-hidden p-0">
        <div className={`relative h-[70vh] min-h-96 ${ascending && ascent < 0.5 ? 'shake' : ''}`}>
          <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMax meet">
            {/* ground and tower fall away as the rocket climbs */}
            <g transform={`translate(0 ${ascent * 420})`}>
              <line x1="0" x2="400" y1="460" y2="460" stroke="#2c5273" />
              <rect x="120" y="230" width="14" height="230" fill="none" stroke="#2c5273" />
              {[260, 300, 340, 380, 420].map((y) => <line key={y} x1="120" x2="134" y1={y} y2={y + 14} stroke="#2c5273" />)}
              <line x1="134" x2="182" y1="300" y2="300" stroke="#2c5273" opacity={ascending ? 0 : 1} />
              <rect x="150" y="452" width="100" height="8" fill="#0f1e30" stroke="#2c5273" />
            </g>
            {/* rocket */}
            <g transform={`translate(0 ${-ascent * 150})`}>
              <path d="M200 180 Q218 215 218 250 L218 440 L182 440 L182 250 Q182 215 200 180 Z" fill="#0a1522" stroke="#5dfc9a" strokeWidth="1.5" />
              <path d="M182 400 L166 446 L182 440 Z M218 400 L234 446 L218 440 Z" fill="#0a1522" stroke="#5dfc9a" strokeWidth="1.5" />
              <line x1="182" x2="218" y1="252" y2="252" stroke="#5dfc9a" />
              <line x1="182" x2="218" y1="340" y2="340" stroke="#5dfc9a" opacity="0.5" />
              <text x="200" y="300" textAnchor="middle" fill="#74d4ff" fontSize="10" letterSpacing="2" transform="rotate(-90 200 300)">BEYOND ORBIT</text>
              <path d="M190 440 L186 452 L214 452 L210 440 Z" fill="#0a1522" stroke="#5dfc9a" />
              {ascending && (
                <g className="exhaust">
                  <path d="M187 452 Q200 560 213 452 Z" fill="#ffb547" opacity="0.9" />
                  <path d="M193 452 Q200 510 207 452 Z" fill="#fff3d6" />
                </g>
              )}
            </g>
          </svg>

          <div className="absolute left-0 right-0 top-6 text-center">
            {!ascending && !counting && <p className="display text-lg text-cyan">POLLING FLIGHT CONTROLLERS</p>}
            {counting && (
              <>
                <p className="label">T MINUS</p>
                <p className="display text-8xl font-black text-amber glow tabular-nums">{count}</p>
              </>
            )}
            {ascending && (
              <p className="display text-3xl font-black text-phosphor glow">
                {ascent < 0.15 ? 'IGNITION' : ascent < 1 ? 'LIFTOFF' : 'ORBIT ACHIEVED'}
              </p>
            )}
          </div>
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Go / No-Go Poll">
          <ul className="space-y-1.5 text-sm">
            {POLL.map((station, index) => {
              const go = time > ((index + 1) / POLL.length) * POLL_END;
              return (
                <li key={station} className="flex justify-between">
                  <span className="text-ink/80">{station}</span>
                  <span className={go ? 'text-phosphor' : 'text-mute blink'}>{go ? 'GO' : '· · ·'}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Vehicle" tone="info">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-mute">Liftoff mass</dt><dd className="text-phosphor">{Math.round(stats.wetMass)} kg</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Propellant</dt><dd className="text-phosphor">{stats.fuelLoaded} kg</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Payload</dt><dd className="text-phosphor">{stats.sciencePoints} science pts</dd></div>
          </dl>
        </Panel>
        <Panel title="Ascent Display" tone="info" right="ANIMATION">
          <dl className="space-y-1.5 text-sm tabular-nums">
            <div className="flex justify-between"><dt className="text-mute">Altitude</dt><dd className="text-phosphor">{altitude} km</dd></div>
            <div className="flex justify-between"><dt className="text-mute">Velocity</dt><dd className="text-phosphor">{velocity} m/s</dd></div>
          </dl>
        </Panel>
        <Button variant="ghost" icon={<FastForward size={13} />} onClick={() => dispatch({ type: 'NAVIGATE', screen: 'flight' })}>
          Skip to Flight
        </Button>
      </div>
    </div>
  );
}
