/**
 * Radio signal delay between Earth and the mission destination.
 *
 * Mars uses a simplified model: both planets on circular orbits, positioned
 * from a known Mars opposition (16 January 2025, when Earth passed between
 * the Sun and Mars). Real orbits are elliptical, so the result can differ
 * from the true value by a minute or two, but it follows the real rhythm
 * of Mars moving closer and further away (about 3 to 22 minutes one way).
 */

const AU_LIGHT_SECONDS = 499.0; // light takes ~499 s to cross 1 astronomical unit
const MOON_LIGHT_SECONDS = 384_400 / 299_792.458; // ~1.28 s
const MARS_ORBIT_AU = 1.524;
const EARTH_YEAR_DAYS = 365.256;
const MARS_YEAR_DAYS = 686.98;
const OPPOSITION_2025 = Date.UTC(2025, 0, 16);

export interface LightDelay {
  oneWaySeconds: number;
  distanceKm: number;
  label: string; // e.g. "10 min 12 s"
}

export function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${Math.round(seconds - minutes * 60)} s`;
}

/** Earth–Mars distance in AU on a given date (simplified circular orbits). */
export function earthMarsDistanceAU(date: Date): number {
  const days = (date.getTime() - OPPOSITION_2025) / 86_400_000;
  const angle = 2 * Math.PI * days * (1 / EARTH_YEAR_DAYS - 1 / MARS_YEAR_DAYS);
  return Math.sqrt(1 + MARS_ORBIT_AU ** 2 - 2 * MARS_ORBIT_AU * Math.cos(angle));
}

export function lightDelay(missionId: string, date: Date = new Date()): LightDelay {
  const seconds = missionId === 'mars' ? earthMarsDistanceAU(date) * AU_LIGHT_SECONDS : MOON_LIGHT_SECONDS;
  return { oneWaySeconds: seconds, distanceKm: seconds * 299_792.458, label: formatDelay(seconds) };
}

/**
 * How long, in game seconds, the player waits for Mission Control's analysis
 * during a challenge: one game second per real minute of round-trip delay.
 */
export function analysisWaitSeconds(delay: LightDelay): number {
  return delay.oneWaySeconds < 60 ? 0 : Math.round((delay.oneWaySeconds * 2) / 60);
}
