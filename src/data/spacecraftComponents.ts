import type {
  Build,
  CategoryDef,
  SlotDef,
  SlotId,
  SpacecraftComponent,
} from '../types/spacecraft';

export const CATEGORIES: CategoryDef[] = [
  { id: 'structure', label: 'Structure & Thermal Protection', short: 'STRUCT', blurb: 'The frame that survives launch and landing, and the system that keeps everything at a survivable temperature.' },
  { id: 'power', label: 'Power Systems', short: 'POWER', blurb: 'Generation keeps the lights on. Storage carries you through darkness and emergencies.' },
  { id: 'science', label: 'Scientific Instruments', short: 'SCI', blurb: 'The reason the mission exists. Each instrument adds science, mass, power draw and data.' },
  { id: 'comms', label: 'Communication Systems', short: 'COMMS', blurb: 'Science that never reaches Earth does not count. Size the downlink for your data.' },
  { id: 'propulsion', label: 'Propulsion Systems', short: 'PROP', blurb: 'Engine efficiency decides how much fuel you need. Thrust decides whether you can land.' },
  { id: 'computer', label: 'Onboard Computers & Navigation', short: 'AVIONICS', blurb: 'The brain and the eyes. They decide what the spacecraft can do without help from Earth.' },
];

export const SLOTS: SlotDef[] = [
  { id: 'bus', category: 'structure', label: 'Spacecraft Bus', required: true, max: 1, hint: 'Primary structure' },
  { id: 'thermal', category: 'structure', label: 'Thermal Control', required: true, max: 1, hint: 'Heat rejection and survival heating' },
  { id: 'generation', category: 'power', label: 'Power Generation', required: true, max: 1, hint: 'Primary power source' },
  { id: 'storage', category: 'power', label: 'Energy Storage', required: true, max: 1, hint: 'Battery bank' },
  { id: 'instruments', category: 'science', label: 'Instrument Bay', required: true, max: 3, hint: 'Up to three instruments' },
  { id: 'antenna', category: 'comms', label: 'Primary Antenna', required: true, max: 1, hint: 'Main link to Earth' },
  { id: 'backup', category: 'comms', label: 'Secondary Radio', required: false, max: 1, hint: 'Optional backup link' },
  { id: 'engine', category: 'propulsion', label: 'Main Engine', required: true, max: 1, hint: 'Manoeuvres and landing' },
  { id: 'tank', category: 'propulsion', label: 'Propellant Tank', required: true, max: 1, hint: 'Fuel load' },
  { id: 'cpu', category: 'computer', label: 'Flight Computer', required: true, max: 1, hint: 'Command and data handling' },
  { id: 'nav', category: 'computer', label: 'Navigation Sensors', required: true, max: 1, hint: 'Guidance for cruise and landing' },
];

export const COMPONENTS: SpacecraftComponent[] = [
  // ---- Structure ----
  { id: 'bus_light', slot: 'bus', name: 'Composite Lite Frame', description: 'Carbon-composite frame with thin panels.', tradeoff: 'Saves mass and money, but has little structural margin for a rough landing.', mass: 180, cost: 18, reliability: 0.9, powerDraw: 40, hull: 70, thermal: 5 },
  { id: 'bus_std', slot: 'bus', name: 'Aluminium Standard Bus', description: 'Flight-proven aluminium honeycomb bus.', tradeoff: 'Balanced mass, cost and strength.', mass: 260, cost: 26, reliability: 0.95, powerDraw: 40, hull: 85, thermal: 10 },
  { id: 'bus_heavy', slot: 'bus', name: 'Titanium Reinforced Bus', description: 'Reinforced primary structure with landing-load margin.', tradeoff: 'Survives hard landings, but the extra mass demands more fuel and thrust.', mass: 380, cost: 40, reliability: 0.98, powerDraw: 40, hull: 100, thermal: 15 },

  // ---- Thermal ----
  { id: 'th_mli', slot: 'thermal', name: 'MLI Blanket Wrap', description: 'Passive multi-layer insulation only.', tradeoff: 'Nearly free and uses no power, but offers weak protection in extreme cold.', mass: 15, cost: 4, reliability: 0.97, powerDraw: 0, thermal: 25 },
  { id: 'th_loop', slot: 'thermal', name: 'Heater + Radiator Loop', description: 'Pumped coolant loop with electric heaters.', tradeoff: 'Solid mid-range protection for a moderate power draw.', mass: 45, cost: 12, reliability: 0.94, powerDraw: 60, thermal: 50 },
  { id: 'th_active', slot: 'thermal', name: 'Active Cryo-Thermal Control', description: 'Dual loops, louvers and heat switches.', tradeoff: 'Handles any environment, but is heavy, expensive and power hungry.', mass: 80, cost: 24, reliability: 0.96, powerDraw: 120, thermal: 80 },

  // ---- Power generation ----
  { id: 'pw_solar_s', slot: 'generation', name: 'Compact Solar Array', description: 'Body-mounted cells, 600 W at Earth.', tradeoff: 'Light and cheap. Output falls sharply far from the Sun or at low sun angles.', mass: 40, cost: 8, reliability: 0.95, powerDraw: 0, powerGen: 600, solar: true },
  { id: 'pw_solar_l', slot: 'generation', name: 'Deployable Solar Wings', description: 'Twin fold-out wings, 1400 W at Earth.', tradeoff: 'Plenty of power, but the deployment mechanism can fail and dust degrades it.', mass: 95, cost: 20, reliability: 0.92, powerDraw: 0, powerGen: 1400, solar: true },
  { id: 'pw_rtg', slot: 'generation', name: 'Radioisotope Generator (RTG)', description: 'Nuclear heat source, 520 W anywhere.', tradeoff: 'Ignores darkness and dust and adds waste heat, but is very expensive and heavy.', mass: 110, cost: 55, reliability: 0.99, powerDraw: 0, powerGen: 520, solar: false, thermal: 15 },

  // ---- Energy storage ----
  { id: 'bat_s', slot: 'storage', name: 'Li-Ion Pack 1 kWh', description: 'Single-string lithium-ion pack.', tradeoff: 'Minimal mass. Leaves almost no reserve for shadow or emergencies.', mass: 20, cost: 3, reliability: 0.95, powerDraw: 0, energyWh: 1000 },
  { id: 'bat_m', slot: 'storage', name: 'Li-Ion Bank 3 kWh', description: 'Three-string battery bank.', tradeoff: 'Reasonable reserve at reasonable mass.', mass: 50, cost: 8, reliability: 0.96, powerDraw: 0, energyWh: 3000 },
  { id: 'bat_l', slot: 'storage', name: 'High-Capacity Bank 6 kWh', description: 'Six-string bank with cell balancing.', tradeoff: 'Carries the spacecraft through long outages, at a mass penalty.', mass: 95, cost: 16, reliability: 0.97, powerDraw: 0, energyWh: 6000 },

  // ---- Instruments ----
  { id: 'sci_cam', slot: 'instruments', name: 'Hi-Res Stereo Camera', description: 'Colour stereo imager for terrain context.', tradeoff: 'Cheap science, but produces a lot of data to downlink.', mass: 12, cost: 8, reliability: 0.97, powerDraw: 30, science: { lunar: 20, mars: 20 }, dataGB: 8 },
  { id: 'sci_spec', slot: 'instruments', name: 'Infrared Spectrometer', description: 'Identifies minerals and volatiles remotely.', tradeoff: 'Strong science return for moderate resources.', mass: 18, cost: 14, reliability: 0.95, powerDraw: 45, science: { lunar: 25, mars: 25 }, dataGB: 5 },
  { id: 'sci_neutron', slot: 'instruments', name: 'Neutron Ice Detector', description: 'Senses hydrogen (water ice) below the surface.', tradeoff: 'The key instrument for polar ice. Less valuable elsewhere.', mass: 22, cost: 18, reliability: 0.95, powerDraw: 35, science: { lunar: 40, mars: 15 }, dataGB: 2 },
  { id: 'sci_drill', slot: 'instruments', name: 'Sample Drill & Cache System', description: 'Rotary-percussive drill with sealed sample tubes.', tradeoff: 'Highest science value, but heavy, power hungry and mechanically delicate.', mass: 60, cost: 30, reliability: 0.9, powerDraw: 150, science: { lunar: 35, mars: 50 }, dataGB: 3 },
  { id: 'sci_radar', slot: 'instruments', name: 'Ground-Penetrating Radar', description: 'Maps buried layers down to 10 m.', tradeoff: 'Good science, large data volume.', mass: 28, cost: 16, reliability: 0.94, powerDraw: 70, science: { lunar: 25, mars: 25 }, dataGB: 10 },
  { id: 'sci_weather', slot: 'instruments', name: 'Environment Monitor Suite', description: 'Temperature, radiation and dust sensors.', tradeoff: 'Tiny and reliable, with modest science value.', mass: 8, cost: 5, reliability: 0.98, powerDraw: 15, science: { lunar: 8, mars: 15 }, dataGB: 1 },

  // ---- Comms ----
  { id: 'com_lga', slot: 'antenna', name: 'Low-Gain Omni Antenna', description: 'Fixed omnidirectional antenna, 64 kbps.', tradeoff: 'Never needs pointing, but far too slow for a large data set.', mass: 3, cost: 2, reliability: 0.99, powerDraw: 15, commKbps: 64 },
  { id: 'com_mga', slot: 'antenna', name: 'Medium-Gain Patch Array', description: 'Fixed patch array, 512 kbps.', tradeoff: 'A compromise: no moving parts, moderate data rate.', mass: 10, cost: 9, reliability: 0.96, powerDraw: 35, commKbps: 512 },
  { id: 'com_hga', slot: 'antenna', name: 'High-Gain Steerable Dish', description: 'Gimballed 1.2 m dish, 4000 kbps.', tradeoff: 'Enormous data rate, but the pointing mechanism is a failure point.', mass: 28, cost: 22, reliability: 0.92, powerDraw: 70, commKbps: 4000 },
  { id: 'com_uhf', slot: 'backup', name: 'UHF Relay Radio', description: 'Talks to orbiters overhead, 256 kbps regardless of distance.', tradeoff: 'A second path to Earth that does not weaken with distance.', mass: 6, cost: 9, reliability: 0.97, powerDraw: 20, commKbps: 256, relay: true },
  { id: 'com_redundant', slot: 'backup', name: 'Redundant Transponder', description: 'Cold-spare copy of the main radio electronics.', tradeoff: 'Adds no speed, but removes a single point of failure.', mass: 8, cost: 10, reliability: 0.99, powerDraw: 10, redundantComm: true },

  // ---- Propulsion ----
  { id: 'eng_mono', slot: 'engine', name: 'Monopropellant Thrusters', description: 'Simple hydrazine thruster cluster, 2 kN.', tradeoff: 'Very reliable and cheap, but inefficient and weak for heavy landers.', mass: 30, cost: 8, reliability: 0.98, powerDraw: 10, thrustKN: 2, efficiency: 0.75 },
  { id: 'eng_biprop', slot: 'engine', name: 'Bipropellant Main Engine', description: 'Pressure-fed bipropellant engine, 12 kN.', tradeoff: 'The standard choice: good efficiency and thrust.', mass: 70, cost: 20, reliability: 0.95, powerDraw: 20, thrustKN: 12, efficiency: 1 },
  { id: 'eng_methalox', slot: 'engine', name: 'Methalox High-Efficiency Engine', description: 'Pump-fed methane/oxygen engine, 18 kN.', tradeoff: 'Needs the least fuel, but is costly, heavy and less proven.', mass: 110, cost: 42, reliability: 0.91, powerDraw: 40, thrustKN: 18, efficiency: 1.3 },
  { id: 'tank_s', slot: 'tank', name: 'Small Tank — 400 kg', description: '400 kg of propellant.', tradeoff: 'Light, but only suits a light, efficient spacecraft.', mass: 30, cost: 4, reliability: 0.97, powerDraw: 0, fuelKg: 400 },
  { id: 'tank_m', slot: 'tank', name: 'Medium Tank — 800 kg', description: '800 kg of propellant.', tradeoff: 'Fits most designs with some reserve.', mass: 55, cost: 7, reliability: 0.97, powerDraw: 0, fuelKg: 800 },
  { id: 'tank_l', slot: 'tank', name: 'Large Tank — 1300 kg', description: '1300 kg of propellant.', tradeoff: 'Generous reserve, but may exceed the launch mass limit.', mass: 85, cost: 11, reliability: 0.97, powerDraw: 0, fuelKg: 1300 },

  // ---- Computer & navigation ----
  { id: 'cpu_basic', slot: 'cpu', name: 'Commercial Flight Computer', description: 'Off-the-shelf processor, 16 GB storage.', tradeoff: 'Cheap and light, but vulnerable to radiation and slow in emergencies.', mass: 5, cost: 5, reliability: 0.9, powerDraw: 25, compute: 40, radHard: 20, storageGB: 16 },
  { id: 'cpu_rad', slot: 'cpu', name: 'Rad-Hardened Computer', description: 'Radiation-hardened processor, 32 GB storage.', tradeoff: 'Shrugs off radiation. Moderate speed.', mass: 9, cost: 18, reliability: 0.97, powerDraw: 40, compute: 60, radHard: 85, storageGB: 32 },
  { id: 'cpu_tmr', slot: 'cpu', name: 'Triple-Redundant Avionics', description: 'Three voting computers, 64 GB storage.', tradeoff: 'Fastest and most fault tolerant, at a high price and power draw.', mass: 20, cost: 34, reliability: 0.995, powerDraw: 85, compute: 90, radHard: 70, storageGB: 64 },
  { id: 'nav_imu', slot: 'nav', name: 'IMU + Sun Sensors', description: 'Inertial unit with coarse sun sensors.', tradeoff: 'Enough for cruise. Cannot see landing hazards.', mass: 4, cost: 3, reliability: 0.96, powerDraw: 10, nav: 30 },
  { id: 'nav_star', slot: 'nav', name: 'Star Tracker Suite', description: 'Dual star trackers with landing radar.', tradeoff: 'Accurate pointing and a decent landing with help from Earth.', mass: 8, cost: 10, reliability: 0.97, powerDraw: 20, nav: 60 },
  { id: 'nav_trn', slot: 'nav', name: 'Terrain-Relative Nav + Lidar', description: 'Matches camera images to maps and scans for hazards.', tradeoff: 'Lands itself precisely, but is expensive and power hungry.', mass: 18, cost: 24, reliability: 0.94, powerDraw: 55, nav: 90 },
];

const BY_ID = new Map(COMPONENTS.map((c) => [c.id, c]));

export function getComponent(id: string): SpacecraftComponent {
  const component = BY_ID.get(id);
  if (!component) throw new Error(`Unknown component: ${id}`);
  return component;
}

export function componentsForSlot(slot: SlotId): SpacecraftComponent[] {
  return COMPONENTS.filter((c) => c.slot === slot);
}

export function emptyBuild(): Build {
  return {
    bus: [], thermal: [], generation: [], storage: [], instruments: [],
    antenna: [], backup: [], engine: [], tank: [], cpu: [], nav: [],
  };
}
