import { BatteryCharging, Fuel, Microscope, Radio, Shield, Zap } from 'lucide-react';
import { CATEGORIES } from '../../data/spacecraftComponents';
import { getStat, plannedFuelRemaining } from '../../engine/decisionProcessor';
import type { FlightState } from '../../types/gameState';
import type { Mission } from '../../types/mission';
import { Meter } from '../UI/Meter';
import type { Tone } from '../UI/Panel';

/** Live spacecraft status. Every value is read from the engine's FlightState. */
export function TelemetryPanel({ state, mission }: { state: FlightState; mission: Mission }) {
  const { specs } = state;
  const planned = plannedFuelRemaining(state, mission);
  const fuelTone: Tone = state.fuel < planned ? 'crit' : state.fuel < planned * 1.1 + 1 ? 'warn' : 'good';
  const batteryPct = getStat(state, mission, 'batteryPct');
  const margin = getStat(state, mission, 'powerMarginPct');
  const capacityGB = (state.commKbps * 3600 * specs.commWindowHours) / 8e6;
  const dataGB = specs.dataGB * state.scienceMult;

  return (
    <div className="space-y-3.5">
      <Meter
        icon={<Fuel size={11} />} label="Remaining fuel" tone={fuelTone}
        value={`${Math.round(state.fuel)} kg`} pct={(state.fuel / specs.fuelCapacity) * 100}
        marker={(planned / specs.fuelCapacity) * 100}
        note={`${Math.round(planned)} kg still needed for planned burns (marker)`}
      />
      <Meter
        icon={<BatteryCharging size={11} />} label="Battery" tone={batteryPct < 25 ? 'crit' : batteryPct < 60 ? 'warn' : 'good'}
        value={`${Math.round(state.batteryWh)} Wh · ${batteryPct.toFixed(0)}%`} pct={batteryPct}
      />
      <Meter
        icon={<Zap size={11} />} label="Power" tone={margin < 0 ? 'crit' : margin < 25 ? 'warn' : 'good'}
        value={`${Math.round(state.powerGen)} W gen / ${Math.round(state.powerDraw)} W load`}
        pct={state.powerGen > 0 ? (state.powerDraw / state.powerGen) * 100 : 100}
        note={margin < 0 ? `Deficit ${Math.round(state.powerDraw - state.powerGen)} W — battery is discharging` : `Margin ${margin.toFixed(0)}%`}
      />
      <Meter
        icon={<Radio size={11} />} label="Communication" tone={capacityGB < dataGB ? 'crit' : capacityGB < dataGB * 1.5 ? 'warn' : 'good'}
        value={`${Math.round(state.commKbps)} kbps`} pct={dataGB > 0 ? (capacityGB / (dataGB * 1.5)) * 100 : 100} marker={66.7}
        note={`Can return ${capacityGB.toFixed(1)} GB of ${dataGB.toFixed(1)} GB expected`}
      />
      <Meter
        icon={<Shield size={11} />} label="Structural margin" tone={state.hull < 40 ? 'crit' : state.hull < 70 ? 'warn' : 'good'}
        value={`${Math.round(state.hull)}`} pct={state.hull}
      />
      <Meter
        icon={<Microscope size={11} />} label="Science yield" tone={state.scienceMult < 0.6 ? 'crit' : state.scienceMult < 0.9 ? 'warn' : 'good'}
        value={`${Math.round(state.scienceMult * 100)}%`} pct={state.scienceMult * 100}
        note={`Projected ${Math.round(specs.sciencePoints * state.scienceMult * (state.health.science / 100))} of ${specs.scienceTarget} pts needed`}
      />

      <div className="border-t border-line pt-3">
        <div className="label mb-2">System health</div>
        <div className="grid grid-cols-3 gap-1.5">
          {CATEGORIES.map((c) => {
            const health = state.health[c.id];
            const tone = health < 50 ? 'border-alert text-alert' : health < 90 ? 'border-amber/60 text-amber' : 'border-line text-phosphor';
            return (
              <div key={c.id} className={`border px-1.5 py-1 text-center ${tone}`}>
                <div className="text-[10px] tracking-wider text-mute">{c.short}</div>
                <div className="text-sm tabular-nums">{Math.round(health)}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
