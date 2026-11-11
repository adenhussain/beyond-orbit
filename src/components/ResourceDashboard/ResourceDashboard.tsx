import { Database, DollarSign, Fuel, Radio, Weight, Zap } from 'lucide-react';
import type { BuildStats } from '../../types/spacecraft';
import { Meter } from '../UI/Meter';
import type { Tone } from '../UI/Panel';

const round = Math.round;

/** The six managed resources. Every number comes from calculateBuildStats(). */
export function ResourceDashboard({ stats }: { stats: BuildStats }) {
  const budgetTone: Tone = stats.cost > stats.budget ? 'crit' : stats.cost > stats.budget * 0.9 ? 'warn' : 'good';
  const massTone: Tone = stats.wetMass > stats.maxMass ? 'crit' : stats.wetMass > stats.maxMass * 0.92 ? 'warn' : 'good';

  const hasPower = stats.powerGen > 0;
  const powerTone: Tone = !hasPower ? 'mute' : stats.powerMarginPct < 0 ? 'crit' : stats.powerMarginPct < 25 ? 'warn' : 'good';

  const hasFuel = stats.fuelLoaded > 0;
  const fuelTone: Tone = !hasFuel ? 'mute' : stats.fuelLoaded < stats.fuelRequired ? 'crit' : stats.fuelReservePct < 15 ? 'warn' : 'good';

  const linkRatio = stats.dataGeneratedGB > 0 ? stats.commCapacityGB / stats.dataGeneratedGB : stats.commKbps > 0 ? 9 : 0;
  const commTone: Tone = stats.commKbps === 0 ? 'mute' : linkRatio < 1 ? 'crit' : linkRatio < 1.5 ? 'warn' : 'good';

  const storageTone: Tone = stats.storageGB === 0 ? 'mute' : stats.storageGB < stats.dataGeneratedGB ? 'crit' : 'good';

  return (
    <div className="space-y-3.5">
      <Meter
        icon={<DollarSign size={11} />} label="Budget" tone={budgetTone}
        value={`$${stats.cost}M / $${stats.budget}M`} pct={(stats.cost / stats.budget) * 100}
        note={stats.cost > stats.budget ? `Over by $${stats.cost - stats.budget}M` : `$${stats.budget - stats.cost}M remaining`}
      />
      <Meter
        icon={<Weight size={11} />} label="Spacecraft Mass" tone={massTone}
        value={`${round(stats.wetMass)} / ${stats.maxMass} kg`} pct={(stats.wetMass / stats.maxMass) * 100}
        note={`${round(stats.dryMass)} kg dry + ${stats.fuelLoaded} kg propellant`}
      />
      <Meter
        icon={<Zap size={11} />} label="Power" tone={powerTone}
        value={`${round(stats.powerGen)} W gen / ${stats.powerDraw} W load`}
        pct={hasPower ? (stats.powerDraw / stats.powerGen) * 100 : 0}
        note={hasPower ? `Margin ${stats.powerMarginPct.toFixed(0)}% · battery ${stats.batteryHours.toFixed(1)} h of essentials` : 'No power source fitted'}
      />
      <Meter
        icon={<Fuel size={11} />} label="Fuel" tone={fuelTone}
        value={`${stats.fuelLoaded} kg / ${round(stats.fuelRequired)} kg needed`}
        pct={hasFuel ? (stats.fuelRequired / stats.fuelLoaded) * 100 : 0}
        note={hasFuel ? `Reserve ${stats.fuelReservePct.toFixed(0)}% beyond planned burns` : 'No propellant tank fitted'}
      />
      <Meter
        icon={<Radio size={11} />} label="Communication Capacity" tone={commTone}
        value={`${round(stats.commKbps)} kbps`} pct={(linkRatio / 1.5) * 100} marker={66.7}
        note={`Can return ${stats.commCapacityGB.toFixed(1)} GB · payload produces ${stats.dataGeneratedGB} GB`}
      />
      <Meter
        icon={<Database size={11} />} label="Science Data Capacity" tone={storageTone}
        value={`${stats.dataGeneratedGB} / ${stats.storageGB} GB`}
        pct={stats.storageGB > 0 ? (stats.dataGeneratedGB / stats.storageGB) * 100 : 0}
        note={stats.storageGB > 0 ? 'Instrument data against onboard storage' : 'No flight computer fitted'}
      />
    </div>
  );
}
