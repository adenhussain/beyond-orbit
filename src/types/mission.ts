export interface MissionPhase {
  name: string;
  location: string;
}

export interface Mission {
  id: string;
  name: string;
  codename: string;
  destination: string;
  objective: string;
  difficulty: 'MODERATE' | 'HARD' | 'EXTREME';
  durationDays: number;
  durationLabel: string;
  environment: string[];
  requiredCapabilities: string[];
  briefing: string[];
  /** Component ids that must be on board for this mission. */
  requiredComponents: string[];
  keyInstruments: string[];

  // --- Engineering parameters used by the simulation engine ---
  budget: number; // $M
  maxLaunchMass: number; // kg, fuelled
  fuelFactor: number; // kg of propellant needed per kg of dry mass (for efficiency 1.0)
  solarFactor: number; // fraction of Earth-distance solar output available
  commFactor: number; // fraction of reference data rate available at this distance
  commWindowHours: number; // total downlink time available for science return
  thermalDemand: number; // thermal rating needed for zero thermal debt
  nightHours: number; // hours the battery must carry essential loads
  gravity: number; // effective landing gravity (m/s^2)
  minTwr: number; // thrust-to-weight needed for a controlled landing
  scienceTarget: number; // science points for 100% objective

  /** Five phases: launch leg, then one per flight segment. */
  phases: MissionPhase[];
  /** Fraction of required fuel burned in each of the 4 flight segments. */
  segmentBurn: [number, number, number, number];
  /** Mission progress (%) and mission day at the end of each of the 4 segments. */
  segmentProgress: [number, number, number, number];
  segmentDay: [number, number, number, number];
}
