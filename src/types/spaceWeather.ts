/** A summary of recent real solar activity, from NASA's DONKI database. */
export interface SpaceWeather {
  /**
   * live = fetched now; cached = fetched within the last few hours;
   * snapshot = real NASA data bundled with the game (when the network or the
   * shared DEMO_KEY rate limit is unavailable); offline = no data at all.
   */
  source: 'live' | 'cached' | 'snapshot' | 'offline';
  level: 'quiet' | 'moderate' | 'strong';
  /** Number of coronal mass ejections (CMEs) recorded in the window. */
  eventCount: number;
  /** Speed of the fastest CME in km/s, or null if none was measured. */
  fastestSpeed: number | null;
  /** NASA CCMC speed class of the fastest CME: S, C, O, R or ER. */
  fastestType: string | null;
  /** UTC date (YYYY-MM-DD) of the fastest CME. */
  fastestDate: string | null;
  windowDays: number;
  fetchedAt: string;
}
