import snapshot from '../data/spaceWeatherSnapshot.json';
import type { SpaceWeather } from '../types/spaceWeather';

/**
 * LIVE NASA DATA: recent coronal mass ejections (CMEs) from DONKI, NASA's
 * Space Weather Database Of Notifications, Knowledge, Information
 * (https://api.nasa.gov). A CME is exactly the event the Mars mission's
 * first emergency is about, so real solar activity sets its strength.
 *
 * It uses NASA's public DEMO_KEY, which is meant for light use like this and
 * is not a secret. If the request fails (offline, rate limited), the game
 * plays with its normal, built-in storm.
 *
 * The result is captured once at launch and stored inside the flight state,
 * so a mission (and every Time Machine timeline) stays deterministic.
 */

const ENDPOINT = 'https://api.nasa.gov/DONKI/CME';
const WINDOW_DAYS = 30;
const CACHE_KEY = 'beyond-orbit-space-weather-v2';
const CACHE_HOURS = 3;

/** CME speeds (km/s) that count as moderate and strong for the game. */
export const MODERATE_SPEED = 1000; // NASA CCMC class "O" and faster
export const STRONG_SPEED = 1500;

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

interface DonkiCme {
  startTime?: string;
  cmeAnalyses?: { speed?: number | null; type?: string | null; isMostAccurate?: boolean }[] | null;
}

/** Turns a DONKI CME list into the summary the game uses. */
export function summariseCmes(cmes: DonkiCme[], source: SpaceWeather['source']): SpaceWeather {
  let fastest: { speed: number; type: string | null; date: string } | null = null;
  for (const cme of cmes) {
    const analyses = cme.cmeAnalyses ?? [];
    const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0];
    const speed = best?.speed ?? null;
    if (speed === null || speed === undefined) continue;
    if (!fastest || speed > fastest.speed) {
      fastest = { speed, type: best?.type ?? null, date: (cme.startTime ?? '').slice(0, 10) };
    }
  }
  const speed = fastest?.speed ?? 0;
  return {
    source,
    level: speed >= STRONG_SPEED ? 'strong' : speed >= MODERATE_SPEED ? 'moderate' : 'quiet',
    eventCount: cmes.length,
    fastestSpeed: fastest?.speed ?? null,
    fastestType: fastest?.type ?? null,
    fastestDate: fastest?.date ?? null,
    windowDays: WINDOW_DAYS,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Real NASA data saved into the game by `npm run update-space-weather`.
 * Used when the live request fails, so the feature still shows real data on
 * busy hackathon Wi-Fi where the shared DEMO_KEY is often rate limited.
 */
export const SNAPSHOT_WEATHER = snapshot as SpaceWeather;

export const OFFLINE_WEATHER: SpaceWeather = {
  source: 'offline', level: 'quiet', eventCount: 0, fastestSpeed: null, fastestType: null, fastestDate: null,
  windowDays: WINDOW_DAYS, fetchedAt: '',
};

function readCache(): SpaceWeather | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as SpaceWeather;
    const ageHours = (Date.now() - Date.parse(cached.fetchedAt)) / 3_600_000;
    return ageHours < CACHE_HOURS ? { ...cached, source: 'cached' } : null;
  } catch {
    return null;
  }
}

export async function fetchSpaceWeather(): Promise<SpaceWeather> {
  const cached = readCache();
  if (cached) return cached;
  try {
    const end = new Date();
    const start = new Date(end.getTime() - WINDOW_DAYS * 86_400_000);
    const url = `${ENDPOINT}?startDate=${isoDate(start)}&endDate=${isoDate(end)}&api_key=DEMO_KEY`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return SNAPSHOT_WEATHER;
    const data: unknown = await response.json();
    if (!Array.isArray(data)) return SNAPSHOT_WEATHER;
    const summary = summariseCmes(data as DonkiCme[], 'live');
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(summary));
    } catch {
      // Storage blocked: fine, we just fetch again next time.
    }
    return summary;
  } catch {
    return SNAPSHOT_WEATHER;
  }
}

/** One-line human description of the data. */
export function describeWeather(sw: SpaceWeather): string {
  if (sw.source === 'offline') return 'No live data (offline). The built-in storm model is used.';
  const asOf = sw.source === 'snapshot' ? ` (NASA data saved ${sw.fetchedAt.slice(0, 10)})` : '';
  if (sw.fastestSpeed === null) return `No coronal mass ejections measured in the last ${sw.windowDays} days.`;
  return `${sw.eventCount} coronal mass ejections in the last ${sw.windowDays} days. Fastest: ${sw.fastestSpeed} km/s on ${sw.fastestDate}${asOf}.`;
}
