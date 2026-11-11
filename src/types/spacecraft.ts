// Types describing spacecraft parts and the result of the engineering calculations.

export type CategoryId = 'structure' | 'power' | 'science' | 'comms' | 'propulsion' | 'computer';

/** A slot is a "socket" on the spacecraft. Each category has one or two slots. */
export type SlotId =
  | 'bus'
  | 'thermal'
  | 'generation'
  | 'storage'
  | 'instruments'
  | 'antenna'
  | 'backup'
  | 'engine'
  | 'tank'
  | 'cpu'
  | 'nav';

export type DebtType = 'thermal' | 'power' | 'reliability' | 'comm';
export type Debts = Record<DebtType, number>;

export interface CategoryDef {
  id: CategoryId;
  label: string;
  short: string;
  blurb: string;
}

export interface SlotDef {
  id: SlotId;
  category: CategoryId;
  label: string;
  required: boolean;
  /** How many components may be fitted in this slot. 1 = picking another replaces it. */
  max: number;
  hint: string;
}

export interface SpacecraftComponent {
  id: string;
  slot: SlotId;
  name: string;
  description: string;
  tradeoff: string;
  mass: number; // kg (dry)
  cost: number; // $M
  reliability: number; // 0..1
  powerDraw: number; // W
  powerGen?: number; // W at Earth distance
  solar?: boolean; // true = output depends on sunlight at the destination
  energyWh?: number; // battery storage
  thermal?: number; // thermal protection rating points
  hull?: number; // structural margin
  commKbps?: number; // downlink rate at reference distance
  relay?: boolean; // relay radios are not weakened by distance
  redundantComm?: boolean;
  science?: Record<string, number>; // science points per mission id
  dataGB?: number; // data produced by an instrument
  thrustKN?: number;
  efficiency?: number; // propellant efficiency factor (higher = less fuel needed)
  fuelKg?: number; // tank capacity
  compute?: number;
  radHard?: number;
  storageGB?: number;
  nav?: number;
}

/** The player's design: for each slot, the ids of the fitted components. */
export type Build = Record<SlotId, string[]>;

export interface BuildStats {
  components: SpacecraftComponent[];
  cost: number;
  budget: number;
  dryMass: number;
  fuelLoaded: number;
  fuelRequired: number;
  fuelReservePct: number;
  wetMass: number;
  maxMass: number;
  powerGen: number;
  powerDraw: number;
  essentialDraw: number;
  instrumentDraw: number;
  powerMarginPct: number;
  batteryWh: number;
  batteryHours: number;
  thermalRating: number;
  thermalDemand: number;
  hullRating: number;
  commKbps: number;
  commCapacityGB: number;
  dataGeneratedGB: number;
  storageGB: number;
  sciencePoints: number;
  scienceTarget: number;
  thrustKN: number;
  twr: number;
  compute: number;
  radHard: number;
  nav: number;
  solar: boolean;
  avgReliability: number;
}

export interface BuildIssue {
  level: 'block' | 'warn' | 'info';
  title: string;
  detail: string;
  debt?: DebtType;
}

export interface DebtContribution {
  debt: DebtType;
  amount: number;
  source: string;
}
