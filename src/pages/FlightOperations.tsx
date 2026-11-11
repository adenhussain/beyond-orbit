import { useEffect, useRef, useState } from 'react';
import { BatteryCharging, FastForward, Fuel, Radio, Shield, Thermometer, Wind, Wrench } from 'lucide-react';
import { ChallengeDialog } from '../components/ChallengeSystem/ChallengeDialog';
import { PhaserGame } from '../components/Game/PhaserGame';
import { HudBar } from '../components/HUD/HudBar';
import { PauseMenu } from '../components/HUD/PauseMenu';
import { TouchControls } from '../components/HUD/TouchControls';
import { SystemPanel } from '../components/MissionControl/SystemPanel';
import { getChallenge } from '../engine/challengeManager';
import { getStat } from '../engine/decisionProcessor';
import { lightDelay } from '../engine/lightTime';
import { cabinTemperature } from '../engine/missionSimulator';
import type { SuitHud } from '../game/bridge';
import { getRoom } from '../game/maps/spacecraftMap';
import { sound } from '../services/sound';
import { useGame } from '../state/useGame';

const CRUISE_SECONDS = 14;
const FAST_SECONDS = 2.5;

/**
 * In-flight phase. The astronaut walks around the spacecraft (Phaser scene)
 * while this component runs the mission clock and shows the ship HUD.
 */
export function FlightOperations() {
  const { state: game, dispatch, mission, timeline } = useGame();
  const [hud, setHud] = useState<SuitHud>({ suit: 100, oxygen: 100, zone: '' });
  const [progress, setProgress] = useState(timeline?.state.progress ?? 0);
  // Time warp starts on in the demo, so presentations stay short.
  const [fast, setFast] = useState(game.demo);
  const fastRef = useRef(fast);
  fastRef.current = fast;

  const overlayOpen = game.challengeOpen || game.systemPanel !== null || game.timeMachineOpen || game.paused;
  // The mission clock stops while the player is paused or using the Time Machine.
  const clockHeld = game.paused || game.timeMachineOpen;
  const heldRef = useRef(clockHeld);
  heldRef.current = clockHeld;

  const timelineId = timeline?.id;
  const stage = timeline?.stage;
  const challengeIndex = timeline?.challengeIndex ?? 0;
  const from = timeline?.state.progress ?? 0;
  const to = mission ? mission.segmentProgress[Math.min(3, challengeIndex)] : 0;

  // Cruise: the ship flies towards the next point while the astronaut is free
  // to move. On arrival the ENGINE decides what happens (ARRIVE).
  useEffect(() => {
    if (stage !== 'cruise') {
      setProgress(from);
      return;
    }
    let value = from;
    let last = Date.now();
    const timer = setInterval(() => {
      const now = Date.now();
      const seconds = (now - last) / 1000;
      last = now;
      if (heldRef.current) return;
      value += ((to - from) * seconds) / (fastRef.current ? FAST_SECONDS : CRUISE_SECONDS);
      if (value >= to) {
        clearInterval(timer);
        setProgress(to);
        dispatch({ type: 'ARRIVE' });
      } else {
        setProgress(value);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [timelineId, stage, challengeIndex, from, to, dispatch]);

  useEffect(() => {
    if (stage === 'challenge') sound.alert();
  }, [stage, challengeIndex, timelineId]);

  if (!mission || !timeline) return null;
  const s = timeline.state;
  const cruising = timeline.stage === 'cruise';
  const batteryPct = getStat(s, mission, 'batteryPct');
  const temperature = cabinTemperature(s);
  const challenge = !cruising && timeline.challengeIndex < 3 ? getChallenge(mission.id, timeline.challengeIndex) : null;
  const awaiting = timeline.stage === 'challenge' && !game.challengeOpen;
  const nextPhase = mission.phases[Math.min(3, timeline.challengeIndex)];

  return (
    <div className="relative h-full overflow-hidden">
      <PhaserGame scene="interior" inputLocked={overlayOpen} onHud={setHud} />

      {/* Ship status */}
      <div className="pointer-events-none absolute left-3 top-3 z-20 space-y-1.5 border border-line bg-navy/80 p-2.5">
        <HudBar icon={<Wind size={14} />} label="Oxygen" value={`${Math.round(s.oxygen)}%`} pct={s.oxygen} />
        <HudBar icon={<BatteryCharging size={14} />} label="Power" value={`${batteryPct.toFixed(0)}% · ${Math.round(s.powerGen - s.powerDraw)} W`} pct={batteryPct} />
        <HudBar icon={<Fuel size={14} />} label="Fuel" value={`${Math.round(s.fuel)} kg`} pct={(s.fuel / s.specs.fuelCapacity) * 100} warnBelow={15} />
        <HudBar icon={<Thermometer size={14} />} label="Temperature" value={`${temperature} °C`} pct={((temperature + 20) / 41) * 100} warnBelow={75} />
        <HudBar icon={<Shield size={14} />} label="Spacecraft" value={`${Math.round(s.hull)}`} pct={s.hull} warnBelow={60} />
      </div>

      {/* Mission status */}
      <div className="pointer-events-none absolute right-3 top-24 z-20 w-72 border border-line bg-navy/80 px-4 py-2 xl:left-1/2 xl:right-auto xl:top-3 xl:w-[440px] xl:-translate-x-1/2">
        <div className="flex justify-between text-[10px] uppercase tracking-widest">
          <span className="text-cyan">{mission.codename} · Timeline {timeline.name}</span>
          <span className="text-mute">Day {s.day} / {mission.durationDays}</span>
        </div>
        <div className="relative mt-1.5 h-2 border border-line bg-void">
          <div className="h-full bg-phosphor" style={{ width: `${progress}%` }} />
          {mission.segmentProgress.slice(0, 3).map((pct, i) => {
            const d = timeline.decisions.find((r) => r.challengeIndex === i);
            return (
              <span key={pct} title={d ? `${d.challengeTitle}: ${d.optionLabel}` : `Challenge ${i + 1}`}
                className={`absolute -top-1 h-4 w-1.5 ${d ? 'bg-phosphor' : timeline.challengeIndex === i && !cruising ? 'blink bg-alert' : 'bg-line-hi'}`}
                style={{ left: `${pct}%` }} />
            );
          })}
        </div>
        <div className={`mt-1 text-sm ${awaiting ? 'text-alert' : 'text-ink'}`}>
          {cruising && `En route to ${nextPhase.name} — you are free to move around the ship`}
          {awaiting && challenge && `EMERGENCY: ${challenge.title}. Go to the ${getRoom(challenge.room).name}.`}
          {!cruising && !awaiting && challenge && `Responding: ${challenge.title}`}
        </div>
      </div>

      {/* Location and supplies */}
      <div className="pointer-events-none absolute right-3 top-3 z-20 border border-line bg-navy/80 px-3 py-2 text-right">
        <div className="label">Location</div>
        <div className="text-sm text-phosphor">{hud.zone || '—'}</div>
        <div className="mt-1 flex items-center justify-end gap-1.5 text-xs text-ink/80"><Wrench size={12} /> {s.repairKits} repair kit{s.repairKits === 1 ? '' : 's'}</div>
        <div className="flex items-center justify-end gap-1.5 text-xs text-cyan"><Radio size={12} /> Earth link {lightDelay(mission.id).label}</div>
      </div>

      {awaiting && challenge && (
        <div className="pointer-events-none absolute left-3 top-44 z-20 w-80 border border-alert bg-alert/10 px-4 py-2 text-xs text-ink/90 xl:left-1/2 xl:top-24 xl:w-[520px] xl:-translate-x-1/2 xl:text-center">
          {challenge.description}
        </div>
      )}

      {cruising && (
        <button
          onClick={() => setFast((v) => !v)}
          aria-pressed={fast}
          className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 border border-line bg-navy/80 px-3 py-1.5 text-xs uppercase tracking-wider text-ink hover:border-cyan hover:text-cyan"
        >
          <FastForward size={13} /> Time warp: {fast ? 'on' : 'off'}
        </button>
      )}
      <div className="pointer-events-none absolute bottom-3 left-3 z-20 text-[11px] tracking-wider text-mute">
        A/D MOVE · SPACE JUMP · E USE CONSOLE · COMMAND ROOM: TIME MACHINE · ESC PAUSE
      </div>

      {game.challengeOpen && <ChallengeDialog />}
      <SystemPanel />
      <TouchControls />
      <PauseMenu />
    </div>
  );
}
