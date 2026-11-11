import { getComponent } from '../data/spacecraftComponents';
import type { Mission } from '../types/mission';
import type {
  Build,
  BuildStats,
  DebtContribution,
  DebtType,
  Debts,
} from '../types/spacecraft';

export const DEBT_TYPES: DebtType[] = ['thermal', 'power', 'reliability', 'comm'];

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function debtLevel(value: number): 'low' | 'elevated' | 'high' | 'critical' {
  if (value >= 80) return 'critical';
  if (value >= 55) return 'high';
  if (value >= 25) return 'elevated';
  return 'low';
}

/**
 * Technical debt created on the ground. Each debt is 0..100 and every point
 * is tied to a named design weakness so failures stay traceable.
 */
export function calculateBuildDebt(
  build: Build,
  mission: Mission,
  stats: BuildStats,
): { debts: Debts; contributions: DebtContribution[] } {
  const contributions: DebtContribution[] = [];
  const add = (debt: DebtType, amount: number, source: string) => {
    if (amount >= 1) contributions.push({ debt, amount: Math.round(amount), source });
  };
  const names = (slots: (keyof Build)[]) =>
    slots.flatMap((s) => build[s]).map((id) => getComponent(id).name).join(' + ');

  // THERMAL: protection rating below what the environment demands.
  if (build.thermal.length > 0 && build.bus.length > 0) {
    const gap = stats.thermalDemand - stats.thermalRating;
    add('thermal', clamp(gap * 2, 0, 100),
      `${names(['thermal', 'bus'])}: thermal rating ${stats.thermalRating} against ${stats.thermalDemand} required.`);
  }

  // POWER: thin generation margin and a battery too small for the dark.
  if (build.generation.length > 0) {
    add('power', clamp((25 - stats.powerMarginPct) * 1.6, 0, 80),
      `${names(['generation'])}: ${Math.round(stats.powerGen)} W generated against ${stats.powerDraw} W demand (margin ${stats.powerMarginPct.toFixed(0)}%, 25% recommended).`);
  }
  if (build.storage.length > 0) {
    const neededHours = stats.solar ? mission.nightHours : mission.nightHours * 0.25;
    add('power', clamp((1 - stats.batteryHours / neededHours) * 40, 0, 40),
      `${names(['storage'])}: ${stats.batteryHours.toFixed(1)} h of essential power stored against ${neededHours.toFixed(0)} h needed.`);
  }

  // RELIABILITY: low-grade parts, and an engine too weak for a soft landing.
  if (stats.components.length > 0) {
    const weakest = [...stats.components]
      .sort((a, b) => a.reliability - b.reliability)
      .slice(0, 3)
      .filter((c) => c.reliability < 0.95)
      .map((c) => `${c.name} (${(c.reliability * 100).toFixed(0)}%)`);
    add('reliability', clamp((0.975 - stats.avgReliability) * 1000, 0, 100),
      `Average component reliability ${(stats.avgReliability * 100).toFixed(1)}%${weakest.length ? `. Weakest: ${weakest.join(', ')}` : ''}.`);
  }
  if (build.engine.length > 0 && stats.twr < mission.minTwr) {
    add('reliability', 15,
      `${names(['engine'])}: thrust-to-weight ${stats.twr.toFixed(2)} against ${mission.minTwr} needed for a soft landing.`);
  }

  // COMMUNICATION: downlink too small for the data, and no backup radio.
  if (build.antenna.length > 0) {
    if (stats.dataGeneratedGB > 0) {
      const ratio = stats.commCapacityGB / stats.dataGeneratedGB;
      add('comm', clamp((1.5 - ratio) * 60, 0, 85),
        `${names(['antenna', 'backup'])}: ${stats.commCapacityGB.toFixed(1)} GB downlink capacity for ${stats.dataGeneratedGB} GB of science data.`);
    }
    if (build.backup.length === 0) {
      add('comm', 15, 'No secondary radio: the primary antenna is a single point of failure.');
    }
  }

  const debts: Debts = { thermal: 0, power: 0, reliability: 0, comm: 0 };
  for (const c of contributions) debts[c.debt] = clamp(debts[c.debt] + c.amount, 0, 100);
  return { debts, contributions };
}
