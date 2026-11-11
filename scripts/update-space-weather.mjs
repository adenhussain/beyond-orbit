// Downloads the last 30 days of coronal mass ejections from NASA DONKI and
// saves a small summary into the game as an offline fallback.
//
//   npm run update-space-weather
//
// Uses NASA_API_KEY from the environment if set (get a free key at
// https://api.nasa.gov), otherwise the public DEMO_KEY. The key is only used
// here, on your machine; it is never put into the game's code.
import { writeFile } from 'node:fs/promises';

const WINDOW_DAYS = 30;
const MODERATE_SPEED = 1000;
const STRONG_SPEED = 1500;
const key = process.env.NASA_API_KEY || 'DEMO_KEY';

const end = new Date();
const start = new Date(end.getTime() - WINDOW_DAYS * 86_400_000);
const day = (d) => d.toISOString().slice(0, 10);
const url = `https://api.nasa.gov/DONKI/CME?startDate=${day(start)}&endDate=${day(end)}&api_key=${key}`;

const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
if (!response.ok) {
  console.error(`NASA DONKI request failed: HTTP ${response.status}. The existing snapshot was kept.`);
  process.exit(1);
}
const cmes = await response.json();

let fastest = null;
for (const cme of cmes) {
  const analyses = cme.cmeAnalyses ?? [];
  const best = analyses.find((a) => a.isMostAccurate) ?? analyses[0];
  if (best?.speed == null) continue;
  if (!fastest || best.speed > fastest.speed) {
    fastest = { speed: best.speed, type: best.type ?? null, date: (cme.startTime ?? '').slice(0, 10) };
  }
}
const speed = fastest?.speed ?? 0;
const snapshot = {
  source: 'snapshot',
  level: speed >= STRONG_SPEED ? 'strong' : speed >= MODERATE_SPEED ? 'moderate' : 'quiet',
  eventCount: cmes.length,
  fastestSpeed: fastest?.speed ?? null,
  fastestType: fastest?.type ?? null,
  fastestDate: fastest?.date ?? null,
  windowDays: WINDOW_DAYS,
  fetchedAt: end.toISOString(),
};

const target = new URL('../src/data/spaceWeatherSnapshot.json', import.meta.url);
await writeFile(target, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Saved NASA DONKI snapshot: ${cmes.length} CMEs, fastest ${snapshot.fastestSpeed} km/s on ${snapshot.fastestDate} (${snapshot.level}).`);
