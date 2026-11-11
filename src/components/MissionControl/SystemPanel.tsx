import { History, Wrench, X } from 'lucide-react';
import { getStat, plannedFuelRemaining } from '../../engine/decisionProcessor';
import { cabinTemperature } from '../../engine/missionSimulator';
import { rewindPoints } from '../../engine/timelineManager';
import { ROOMS } from '../../game/maps/spacecraftMap';
import { sound } from '../../services/sound';
import { useGame } from '../../state/useGame';
import { DebtPanel } from '../ResourceDashboard/DebtPanel';
import { Button } from '../UI/Button';
import { Meter } from '../UI/Meter';
import { Panel } from '../UI/Panel';
import { EventLog } from './EventLog';
import { TelemetryPanel } from './TelemetryPanel';

/**
 * What the astronaut sees after pressing E at a room's console.
 * Each room shows its own system; two of them allow real actions:
 * Life Support (service the scrubbers) and Command (Time Machine).
 */
export function SystemPanel() {
  const { state: game, dispatch, mission, timeline } = useGame();
  const roomId = game.systemPanel;
  if (!roomId || !mission || !timeline) return null;
  const room = ROOMS.find((r) => r.id === roomId)!;
  const s = timeline.state;
  const close = () => dispatch({ type: 'OPEN_PANEL', room: null });
  const batteryPct = getStat(s, mission, 'batteryPct');
  const margin = getStat(s, mission, 'powerMarginPct');
  const planned = plannedFuelRemaining(s, mission);
  const temperature = cabinTemperature(s);
  const canRewind = game.timelines.some((t) => rewindPoints(t).length > 0);
  const capacityGB = (s.commKbps * 3600 * s.specs.commWindowHours) / 8e6;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-void/80 p-4" role="dialog" aria-modal="true" aria-label={room.console}>
      <Panel
        title={`${room.name} — ${room.console}`}
        right={<button onClick={close} aria-label="Close console" className="hover:text-cyan"><X size={14} /></button>}
        className="max-h-full w-full max-w-2xl"
        bodyClassName="overflow-auto p-5"
      >
        {roomId === 'command' && (
          <div className="space-y-4">
            <p className="text-sm text-ink/85">
              Day {s.day} of {mission.durationDays} · {s.phase} · {s.location}. Timeline {timeline.name}, {timeline.decisions.length} of 3 challenges resolved.
            </p>
            <div className="border border-amber/50 bg-amber/5 p-3">
              <div className="label text-amber">Time Machine</div>
              <p className="mt-1 text-xs text-ink/75">
                A snapshot of the whole spacecraft is saved at every decision point. Return to one and take the other path; existing timelines are kept.
              </p>
              <Button
                className="mt-3" variant="amber" icon={<History size={14} />} disabled={!canRewind}
                onClick={() => { sound.timeMachine(); dispatch({ type: 'TIME_MACHINE', open: true }); }}
              >
                {canRewind ? 'Activate Time Machine' : 'Locked until your first decision'}
              </Button>
            </div>
            <TelemetryPanel state={s} mission={mission} />
          </div>
        )}

        {roomId === 'life' && (
          <div className="space-y-4">
            <Meter label="Cabin oxygen reserve" value={`${Math.round(s.oxygen)}%`} pct={s.oxygen} tone={s.oxygen < 25 ? 'crit' : s.oxygen < 50 ? 'warn' : 'good'}
              note="Falls on every flight leg. Falls faster with high power or thermal debt, or a damaged hull." />
            <Meter label="Cabin temperature" value={`${temperature} °C`} pct={((temperature + 20) / 45) * 100} tone={temperature < 0 ? 'crit' : temperature < 12 ? 'warn' : 'good'}
              note={`Set by thermal debt (${Math.round(s.debt.thermal)}).`} />
            <div className="border border-line p-3">
              <div className="label">Manual scrubber service</div>
              <p className="mt-1 text-xs text-ink/75">Uses 1 repair kit and restores 20% oxygen. Kits aboard: <span className="text-phosphor">{s.repairKits}</span>. Some repairs in later emergencies also need a kit.</p>
              <Button
                className="mt-3" icon={<Wrench size={14} />} disabled={s.repairKits < 1 || s.oxygen >= 100}
                onClick={() => { sound.confirm(); dispatch({ type: 'SERVICE_OXYGEN' }); }}
              >
                {s.repairKits < 1 ? 'No repair kits aboard' : s.oxygen >= 100 ? 'Oxygen already full' : 'Service scrubbers'}
              </Button>
            </div>
          </div>
        )}

        {roomId === 'power' && (
          <div className="space-y-4">
            <Meter label="Battery" value={`${Math.round(s.batteryWh)} Wh · ${batteryPct.toFixed(0)}%`} pct={batteryPct} tone={batteryPct < 25 ? 'crit' : batteryPct < 60 ? 'warn' : 'good'} />
            <Meter label="Generation against load" value={`${Math.round(s.powerGen)} W / ${Math.round(s.powerDraw)} W`} pct={s.powerGen > 0 ? (s.powerDraw / s.powerGen) * 100 : 100}
              tone={margin < 0 ? 'crit' : margin < 25 ? 'warn' : 'good'}
              note={margin < 0 ? `Deficit of ${Math.round(s.powerDraw - s.powerGen)} W. The battery can cover it for ${getStat(s, mission, 'backupHours').toFixed(0)} h.` : `Margin ${margin.toFixed(0)}%.`} />
            <DebtPanel debts={s.debt} />
          </div>
        )}

        {roomId === 'engine' && (
          <div className="space-y-4">
            <Meter label="Propellant" value={`${Math.round(s.fuel)} kg`} pct={(s.fuel / s.specs.fuelCapacity) * 100} marker={(planned / s.specs.fuelCapacity) * 100}
              tone={s.fuel < planned ? 'crit' : s.fuel < planned * 1.1 + 1 ? 'warn' : 'good'}
              note={`${Math.round(planned)} kg still needed for planned burns (marker). Reserve ${getStat(s, mission, 'fuelReservePct').toFixed(0)}%.`} />
            <Meter label="Structural margin" value={`${Math.round(s.hull)}`} pct={s.hull} tone={s.hull < 40 ? 'crit' : s.hull < 70 ? 'warn' : 'good'} />
            <p className="text-xs text-mute">Thrust-to-weight for landing: {s.specs.twr.toFixed(2)} (needs {s.specs.minTwr}).</p>
          </div>
        )}

        {roomId === 'comms' && (
          <div className="space-y-4">
            <Meter label="Downlink rate" value={`${Math.round(s.commKbps)} kbps`} pct={Math.min(100, (capacityGB / Math.max(0.1, s.specs.dataGB * 1.5)) * 100)} marker={66.7}
              tone={capacityGB < s.specs.dataGB ? 'crit' : capacityGB < s.specs.dataGB * 1.5 ? 'warn' : 'good'}
              note={`Can return ${capacityGB.toFixed(1)} GB of the ${s.specs.dataGB} GB the payload will produce.`} />
            <Meter label="Communication debt" value={`${Math.round(s.debt.comm)}`} pct={s.debt.comm} marker={60} tone={s.debt.comm >= 60 ? 'crit' : s.debt.comm >= 25 ? 'warn' : 'good'} />
          </div>
        )}

        {roomId === 'lab' && (
          <div className="space-y-4">
            <Meter label="Science yield" value={`${Math.round(s.scienceMult * 100)}%`} pct={s.scienceMult * 100} tone={s.scienceMult < 0.6 ? 'crit' : s.scienceMult < 0.9 ? 'warn' : 'good'}
              note={`Projected ${Math.round(s.specs.sciencePoints * s.scienceMult * (s.health.science / 100))} of ${s.specs.scienceTarget} science points needed.`} />
            <Meter label="Instrument health" value={`${Math.round(s.health.science)}%`} pct={s.health.science} tone={s.health.science < 50 ? 'crit' : s.health.science < 90 ? 'warn' : 'good'} />
            <div className="label">Flight log</div>
            <div className="max-h-52 overflow-auto"><EventLog entries={s.log} limit={12} /></div>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button variant="ghost" onClick={close}>Step Away</Button>
        </div>
      </Panel>
    </div>
  );
}
