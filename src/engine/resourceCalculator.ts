import { RESOURCES, buildMaterials } from '../data/resources';
import { SLOTS, getComponent } from '../data/spacecraftComponents';
import type { Inventory } from '../types/resources';
import type { Mission } from '../types/mission';
import type { Build, BuildIssue, BuildStats, SlotId } from '../types/spacecraft';
import { calculateBuildDebt } from './technicalDebt';

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Turns a list of chosen parts into engineering totals for a given mission. */
export function calculateBuildStats(build: Build, mission: Mission): BuildStats {
  const components = (Object.keys(build) as SlotId[]).flatMap((slot) =>
    build[slot].map(getComponent),
  );

  const dryMass = sum(components.map((c) => c.mass));
  const cost = sum(components.map((c) => c.cost));
  const powerDraw = sum(components.map((c) => c.powerDraw));
  const instrumentDraw = sum(
    components.filter((c) => c.slot === 'instruments').map((c) => c.powerDraw),
  );
  const essentialDraw = powerDraw - instrumentDraw;

  // Solar output scales with sunlight at the destination; an RTG does not.
  const powerGen = sum(
    components.map((c) => (c.powerGen ?? 0) * (c.solar ? mission.solarFactor : 1)),
  );
  const batteryWh = sum(components.map((c) => c.energyWh ?? 0));

  // Direct-to-Earth antennas weaken with distance; relay radios do not.
  const commKbps = sum(
    components.map((c) => (c.commKbps ?? 0) * (c.relay ? 1 : mission.commFactor)),
  );
  const commCapacityGB = (commKbps * 3600 * mission.commWindowHours) / 8e6;

  const engine = components.find((c) => c.slot === 'engine');
  const efficiency = engine?.efficiency ?? 1;
  const thrustKN = engine?.thrustKN ?? 0;
  const fuelLoaded = sum(components.map((c) => c.fuelKg ?? 0));
  // Heavier spacecraft need more propellant (and fuel itself is mass to push);
  // efficient engines need less.
  const fuelRequired = ((dryMass + fuelLoaded * 0.15) * mission.fuelFactor) / efficiency;
  const landedMass = dryMass + fuelRequired * 0.3;
  const twr = landedMass > 0 ? (thrustKN * 1000) / (landedMass * mission.gravity) : 0;

  const sciencePoints = sum(components.map((c) => c.science?.[mission.id] ?? 0));
  const dataGeneratedGB = sum(components.map((c) => c.dataGB ?? 0));

  return {
    components,
    cost,
    budget: mission.budget,
    dryMass,
    fuelLoaded,
    fuelRequired,
    fuelReservePct: fuelRequired > 0 ? ((fuelLoaded - fuelRequired) / fuelRequired) * 100 : 0,
    wetMass: dryMass + fuelLoaded,
    maxMass: mission.maxLaunchMass,
    powerGen,
    powerDraw,
    essentialDraw,
    instrumentDraw,
    powerMarginPct: powerDraw > 0 ? ((powerGen - powerDraw) / powerDraw) * 100 : 0,
    batteryWh,
    batteryHours: essentialDraw > 0 ? batteryWh / essentialDraw : 0,
    thermalRating: sum(components.map((c) => c.thermal ?? 0)),
    thermalDemand: mission.thermalDemand,
    hullRating: sum(components.map((c) => c.hull ?? 0)),
    commKbps,
    commCapacityGB,
    dataGeneratedGB,
    storageGB: sum(components.map((c) => c.storageGB ?? 0)),
    sciencePoints,
    scienceTarget: mission.scienceTarget,
    thrustKN,
    twr,
    compute: sum(components.map((c) => c.compute ?? 0)),
    radHard: sum(components.map((c) => c.radHard ?? 0)),
    nav: sum(components.map((c) => c.nav ?? 0)),
    solar: components.some((c) => c.slot === 'generation' && c.solar === true),
    avgReliability:
      components.length > 0 ? sum(components.map((c) => c.reliability)) / components.length : 1,
  };
}

/**
 * Checks the design. "block" issues prevent launch. "warn" issues allow
 * launch but create technical debt that will matter in flight.
 */
export function validateBuild(
  build: Build,
  mission: Mission,
  stats: BuildStats,
  inventory?: Inventory,
): BuildIssue[] {
  const issues: BuildIssue[] = [];
  const block = (title: string, detail: string) => issues.push({ level: 'block', title, detail });
  const warn = (title: string, detail: string) => issues.push({ level: 'warn', title, detail });

  for (const slot of SLOTS) {
    if (slot.required && build[slot.id].length === 0) {
      block(`${slot.label} missing`, `Select a component for the ${slot.label.toLowerCase()} slot.`);
    }
  }
  for (const id of mission.requiredComponents) {
    const component = getComponent(id);
    if (!build[component.slot].includes(id)) {
      block('Mandatory payload missing', `This mission requires the ${component.name}.`);
    }
  }
  // Supplies: you can only install what the astronaut actually collected.
  if (inventory) {
    const needed = buildMaterials(build);
    for (const resource of RESOURCES) {
      const short = needed[resource.id] - inventory[resource.id];
      if (short > 0) {
        block(
          `Not enough ${resource.label.toLowerCase()}`,
          `The design needs ${needed[resource.id]} x ${resource.item} but only ${inventory[resource.id]} collected. Find ${short} more outside or choose simpler parts.`,
        );
      }
    }
  }
  if (stats.cost > stats.budget) {
    block('Over budget', `Design costs $${stats.cost}M against a budget of $${stats.budget}M.`);
  }
  if (stats.wetMass > stats.maxMass) {
    block(
      'Too heavy to launch',
      `Fuelled mass ${Math.round(stats.wetMass)} kg exceeds the launcher limit of ${stats.maxMass} kg.`,
    );
  }

  const hasPropulsion = build.engine.length > 0 && build.tank.length > 0;
  if (hasPropulsion && stats.fuelLoaded < stats.fuelRequired) {
    block(
      'Not enough fuel to reach the destination',
      `The mission needs ${Math.round(stats.fuelRequired)} kg of propellant; the tank holds ${stats.fuelLoaded} kg. Use a larger tank, a more efficient engine or a lighter design.`,
    );
  } else if (hasPropulsion && stats.fuelReservePct < 15) {
    warn(
      'Thin fuel reserve',
      `Only ${stats.fuelReservePct.toFixed(0)}% reserve beyond planned burns. Any unplanned manoeuvre could leave the landing short.`,
    );
  }
  if (build.engine.length > 0 && stats.twr < 1) {
    block(
      'Engine cannot land this mass',
      `Thrust-to-weight is ${stats.twr.toFixed(2)}. Below 1.0 the engine cannot slow the lander at all.`,
    );
  }
  if (build.generation.length > 0 && stats.powerGen < stats.essentialDraw) {
    block(
      'Power cannot run essential systems',
      `Generation at the destination is ${Math.round(stats.powerGen)} W; essential systems alone need ${stats.essentialDraw} W.`,
    );
  }
  if (build.cpu.length > 0 && build.instruments.length > 0 && stats.storageGB < stats.dataGeneratedGB) {
    warn(
      'Data storage too small',
      `Instruments produce ${stats.dataGeneratedGB} GB but the computer stores ${stats.storageGB} GB. The excess will be lost.`,
    );
  }
  if (build.instruments.length > 0 && stats.sciencePoints < stats.scienceTarget) {
    warn(
      'Payload below the science objective',
      `Instruments can deliver ${stats.sciencePoints} of the ${stats.scienceTarget} science points needed, even on a flawless flight.`,
    );
  }

  // Every source of technical debt is shown to the player as a warning.
  for (const c of calculateBuildDebt(build, mission, stats).contributions) {
    issues.push({
      level: 'warn',
      title: `${DEBT_LABEL[c.debt]} debt +${Math.round(c.amount)}`,
      detail: c.source,
      debt: c.debt,
    });
  }
  return issues;
}

export const DEBT_LABEL = {
  thermal: 'Thermal',
  power: 'Power',
  reliability: 'Reliability',
  comm: 'Communication',
} as const;

export function canLaunch(issues: BuildIssue[]): boolean {
  return !issues.some((i) => i.level === 'block');
}
